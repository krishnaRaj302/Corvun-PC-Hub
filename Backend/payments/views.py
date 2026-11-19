import json
import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from orders.models import Order
from orders.views import confirm_order_and_deduct_stock
from promotions.models import Coupon
from accounts.permissions import IsAdmin
from .models import Payment, Refund, WebhookEvent
from .serializers import PaymentSerializer, RefundSerializer
from .razorpay_service import razorpay_service

logger = logging.getLogger(__name__)


# ============================================================
# 1. INITIALIZE PAYMENT (POST /api/payments/create/)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_payment(request):
    """
    Initializes a payment for an existing eligible customer order.
    Creates or reuses a Razorpay order without marking payment completed.
    Returns Razorpay checkout initialization parameters.
    """
    order_id = request.data.get("order_id")
    payment_method = str(request.data.get("payment_method", "razorpay")).strip().lower()
    coupon_id = request.data.get("coupon_id")

    if not order_id:
        return Response(
            {"error": "Order ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if payment_method not in ["razorpay", "cod"]:
        return Response(
            {"error": "Invalid payment method. Allowed: 'razorpay', 'cod'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Fetch user's order
    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found or permission denied."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate order eligibility
    if order.payment_status == "completed":
        return Response(
            {"error": "This order has already been paid and confirmed."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if order.status == "cancelled":
        return Response(
            {"error": "This order has been cancelled and cannot be paid."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Optional coupon
    coupon = None
    if coupon_id:
        try:
            coupon = Coupon.objects.get(id=coupon_id, status="active")
        except Coupon.DoesNotExist:
            return Response(
                {"error": "Invalid or inactive coupon."},
                status=status.HTTP_400_BAD_REQUEST
            )

    with transaction.atomic():
        # Prevent duplicate pending records: reuse or create single active payment for this order
        payment = Payment.objects.filter(order=order, user=request.user).order_by("-id").first()

        razorpay_order_id = None
        amount_in_paise = razorpay_service.to_paise(order.total_amount)

        if payment_method == "razorpay":
            # Check if active payment already has a valid Razorpay order ID
            if payment and payment.razorpay_order_id and payment.status == "pending":
                razorpay_order_id = payment.razorpay_order_id
            else:
                # Create a new Razorpay order via SDK
                try:
                    notes = {
                        "corvun_order_id": str(order.id),
                        "order_number": str(order.order_number),
                        "customer_email": str(request.user.email),
                    }
                    rzp_order = razorpay_service.create_order(
                        amount=order.total_amount,
                        receipt=order.order_number,
                        notes=notes
                    )
                    razorpay_order_id = rzp_order.get("id")
                except Exception as e:
                    logger.error(f"Failed to create Razorpay Order for order {order.id}: {str(e)}")
                    return Response(
                        {"error": "Payment gateway communication failed. Please retry."},
                        status=status.HTTP_502_BAD_GATEWAY
                    )

            if payment:
                payment.payment_method = "razorpay"
                payment.amount = order.total_amount
                payment.currency = "INR"
                payment.coupon = coupon
                payment.razorpay_order_id = razorpay_order_id
                payment.status = "pending"
                payment.save()
            else:
                payment = Payment.objects.create(
                    user=request.user,
                    order=order,
                    coupon=coupon,
                    payment_method="razorpay",
                    amount=order.total_amount,
                    currency="INR",
                    razorpay_order_id=razorpay_order_id,
                    status="pending"
                )

        else:
            # Cash on delivery
            if payment:
                payment.payment_method = "cod"
                payment.amount = order.total_amount
                payment.status = "pending"
                payment.save()
            else:
                payment = Payment.objects.create(
                    user=request.user,
                    order=order,
                    coupon=coupon,
                    payment_method="cod",
                    amount=order.total_amount,
                    currency="INR",
                    status="pending"
                )

        order.payment_status = "pending"
        order.save(update_fields=["payment_status"])

    serializer = PaymentSerializer(payment)

    return Response(
        {
            "message": "Payment initialized successfully.",
            "payment_id": payment.id,
            "razorpay_order_id": razorpay_order_id,
            "key": razorpay_service.key_id,
            "amount": amount_in_paise,
            "currency": "INR",
            "order_id": order.id,
            "order_number": order.order_number,
            "payment": serializer.data,
            "customer": {
                "name": request.user.full_name or "",
                "email": request.user.email,
                "phone": getattr(request.user, "phone", "") or "",
            }
        },
        status=status.HTTP_201_CREATED
    )


# ============================================================
# 2. VERIFY PAYMENT (POST /api/payments/verify/)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    Cryptographically verifies Razorpay payment signature.
    Atomically allocates inventory, clears cart, and confirms order.
    Safe against replay/duplicate attacks.
    """
    razorpay_order_id = request.data.get("razorpay_order_id")
    razorpay_payment_id = request.data.get("razorpay_payment_id")
    razorpay_signature = request.data.get("razorpay_signature")

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return Response(
            {
                "error": "Missing verification parameters. razorpay_order_id, razorpay_payment_id, and razorpay_signature are required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find the corresponding payment record
    try:
        payment = Payment.objects.select_related("order", "user").get(
            razorpay_order_id=razorpay_order_id,
            user=request.user
        )
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment record matching the specified Razorpay order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Idempotency check: If already completed, return success immediately
    if payment.status in ["completed", "paid", "success"] and payment.order.payment_status == "completed":
        serializer = PaymentSerializer(payment)
        return Response(
            {
                "message": "Payment has already been verified and confirmed.",
                "verified": True,
                "payment": serializer.data,
                "order_id": payment.order.id,
                "order_number": payment.order.order_number,
            },
            status=status.HTTP_200_OK
        )

    # Cryptographic signature verification
    is_valid_signature = razorpay_service.verify_payment_signature(
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature
    )

    if not is_valid_signature:
        payment.status = "failed"
        payment.error_code = "INVALID_SIGNATURE"
        payment.error_description = "HMAC SHA256 payment signature verification failed."
        payment.razorpay_payment_id = razorpay_payment_id
        payment.save(update_fields=["status", "error_code", "error_description", "razorpay_payment_id", "updated_at"])

        return Response(
            {"error": "Invalid payment signature. Transaction could not be verified."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # In non-simulated live environments, verify fetched amount and currency
    if razorpay_service.is_configured:
        try:
            rzp_payment = razorpay_service.fetch_payment(razorpay_payment_id)
            rzp_amount = rzp_payment.get("amount")
            expected_amount = razorpay_service.to_paise(payment.amount)

            if rzp_amount and int(rzp_amount) != expected_amount:
                payment.status = "failed"
                payment.error_code = "AMOUNT_MISMATCH"
                payment.error_description = f"Paid amount {rzp_amount} paise does not match expected {expected_amount} paise."
                payment.save()
                return Response(
                    {"error": "Payment amount mismatch detected."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            logger.warning(f"Could not fetch payment directly from Razorpay for secondary check: {e}")

    # Transaction-safe inventory deduction and order confirmation
    with transaction.atomic():
        locked_payment = Payment.objects.select_for_update().get(id=payment.id)
        if locked_payment.status == "completed":
            serializer = PaymentSerializer(locked_payment)
            return Response(
                {"message": "Payment already confirmed.", "verified": True, "payment": serializer.data},
                status=status.HTTP_200_OK
            )

        # Allocate stock and clear cart
        success, msg = confirm_order_and_deduct_stock(locked_payment.order)
        if not success:
            locked_payment.status = "failed"
            locked_payment.error_code = "INSUFFICIENT_STOCK_POST_PAYMENT"
            locked_payment.error_description = msg
            locked_payment.save()
            return Response(
                {"error": f"Payment authorized, but stock could not be reserved: {msg}. Please contact support for automatic refund."},
                status=status.HTTP_409_CONFLICT
            )

        locked_payment.status = "completed"
        locked_payment.razorpay_payment_id = razorpay_payment_id
        locked_payment.razorpay_signature = razorpay_signature
        locked_payment.error_code = None
        locked_payment.error_description = None
        locked_payment.save()

    serializer = PaymentSerializer(locked_payment)
    return Response(
        {
            "message": "Payment successfully verified and order confirmed.",
            "verified": True,
            "payment": serializer.data,
            "order_id": locked_payment.order.id,
            "order_number": locked_payment.order.order_number,
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# 3. PAYMENT FAILURE HANDLER (POST /api/payments/failure/)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def payment_failure(request):
    """
    Records payment failures or cancellations reported by client checkout.
    Preserves order in pending state for customer retries without duplicating orders.
    """
    razorpay_order_id = request.data.get("razorpay_order_id")
    order_id = request.data.get("order_id")
    error_code = request.data.get("error_code", "PAYMENT_CANCELLED")
    error_description = request.data.get("error_description", "Payment was not completed by the customer.")
    razorpay_payment_id = request.data.get("razorpay_payment_id")

    payment = None
    if razorpay_order_id:
        payment = Payment.objects.filter(razorpay_order_id=razorpay_order_id, user=request.user).first()
    elif order_id:
        payment = Payment.objects.filter(order_id=order_id, user=request.user).order_by("-id").first()

    if payment and payment.status != "completed":
        payment.status = "failed"
        payment.error_code = str(error_code)[:100]
        payment.error_description = str(error_description)
        if razorpay_payment_id:
            payment.razorpay_payment_id = str(razorpay_payment_id)[:100]
        payment.save(update_fields=["status", "error_code", "error_description", "razorpay_payment_id", "updated_at"])

    return Response(
        {"message": "Payment failure status recorded successfully."},
        status=status.HTTP_200_OK
    )


# ============================================================
# 4. RAZORPAY WEBHOOK (POST /api/payments/webhook/)
# ============================================================

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    """
    Asynchronous Webhook receiver for Razorpay events:
    - payment.authorized / payment.captured
    - payment.failed
    - refund.processed / refund.failed
    Guarantees raw body HMAC SHA256 signature verification and idempotency.
    """
    raw_body = request.body
    signature = request.META.get("HTTP_X_RAZORPAY_SIGNATURE", "")

    # Reject unverified payloads
    if not razorpay_service.verify_webhook_signature(raw_body, signature):
        logger.warning("Razorpay Webhook signature verification failed.")
        return Response(
            {"error": "Invalid webhook signature."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        data = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        logger.error(f"Failed to parse webhook JSON body: {e}")
        return Response({"error": "Malformed JSON payload."}, status=status.HTTP_400_BAD_REQUEST)

    event_id = data.get("id") or request.META.get("HTTP_X_RAZORPAY_EVENT_ID", "")
    event_type = data.get("event", "")
    payload_data = data.get("payload", {})

    # Idempotency check for webhook events
    if event_id:
        if WebhookEvent.objects.filter(event_id=event_id).exists():
            return Response({"status": "ignored", "reason": "Event already processed."}, status=status.HTTP_200_OK)

    logger.info(f"Processing Razorpay Webhook Event: {event_type} (ID: {event_id})")

    # Handle Payment Captured / Authorized
    if event_type in ["payment.captured", "payment.authorized"]:
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        rzp_order_id = payment_entity.get("order_id")
        rzp_pay_id = payment_entity.get("id")

        if rzp_order_id:
            payment = Payment.objects.filter(razorpay_order_id=rzp_order_id).select_related("order").first()
            if payment and payment.status != "completed":
                with transaction.atomic():
                    success, _ = confirm_order_and_deduct_stock(payment.order)
                    if success:
                        payment.status = "completed"
                        payment.razorpay_payment_id = rzp_pay_id
                        payment.save(update_fields=["status", "razorpay_payment_id", "updated_at"])

    # Handle Payment Failed
    elif event_type == "payment.failed":
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        rzp_order_id = payment_entity.get("order_id")
        rzp_pay_id = payment_entity.get("id")
        error_code = payment_entity.get("error_code")
        error_desc = payment_entity.get("error_description")

        if rzp_order_id:
            payment = Payment.objects.filter(razorpay_order_id=rzp_order_id).first()
            if payment and payment.status != "completed":
                payment.status = "failed"
                payment.error_code = str(error_code)[:100] if error_code else "GATEWAY_PAYMENT_FAILED"
                payment.error_description = str(error_desc) if error_desc else "Razorpay reported payment failed."
                if rzp_pay_id:
                    payment.razorpay_payment_id = rzp_pay_id
                payment.save(update_fields=["status", "error_code", "error_description", "razorpay_payment_id", "updated_at"])

    # Handle Refund Processed
    elif event_type == "refund.processed":
        refund_entity = payload_data.get("refund", {}).get("entity", {})
        rzp_refund_id = refund_entity.get("id")
        arn = refund_entity.get("acquirer_data", {}).get("arn")

        if rzp_refund_id:
            refund = Refund.objects.filter(razorpay_refund_id=rzp_refund_id).first()
            if refund:
                refund.status = "processed"
                if arn:
                    refund.arn = arn
                refund.processed_at = timezone.now()
                refund.save(update_fields=["status", "arn", "processed_at"])

    # Track processed webhook event
    if event_id:
        WebhookEvent.objects.create(
            event_id=event_id,
            event_type=event_type,
            payload=data,
            processed=True
        )

    return Response({"status": "processed"}, status=status.HTTP_200_OK)


# ============================================================
# 5. CUSTOMER REFUND REQUEST (POST /api/payments/refund/create/)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_refund(request):
    """
    Registers a customer refund request for an existing completed payment.
    Validates payment status and prevents refund amounts from exceeding total paid.
    """
    payment_id = request.data.get("payment_id")
    reason = request.data.get("reason", "").strip()
    requested_amount = request.data.get("amount")

    if not payment_id:
        return Response({"error": "Payment ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    if not reason:
        return Response({"error": "Refund reason is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = Payment.objects.get(id=payment_id, user=request.user)
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found or access denied."}, status=status.HTTP_404_NOT_FOUND)

    if payment.status not in ["completed", "paid", "success"]:
        return Response(
            {"error": "Refunds can only be requested for completed payments."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Determine refund amount
    refund_amount = Decimal(str(requested_amount)) if requested_amount else payment.amount

    # Check already approved or processed refunds
    existing_refunded = Refund.objects.filter(
        payment=payment,
        status__in=["pending", "approved", "processed"]
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    if existing_refunded + refund_amount > payment.amount:
        remaining_refundable = max(Decimal("0.00"), payment.amount - existing_refunded)
        return Response(
            {
                "error": f"Refund amount exceeds refundable balance. Maximum refundable: ₹{remaining_refundable}"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    refund = Refund.objects.create(
        payment=payment,
        order=payment.order,
        amount=refund_amount,
        gateway=payment.payment_method,
        reason=reason,
        status="pending"
    )

    serializer = RefundSerializer(refund)
    return Response(
        {
            "message": "Refund request created successfully.",
            "refund": serializer.data
        },
        status=status.HTTP_201_CREATED
    )


# ============================================================
# 6. ADMIN REFUNDS (GET, PUT /api/payments/admin/refunds/)
# ============================================================

@api_view(["GET", "PUT"])
@permission_classes([IsAdmin])
def admin_refunds(request, refund_id=None):
    """
    Admin refund management:
    - GET: Enriched list with summary KPIs.
    - PUT: Approve, process, or reject refund. Initiates real Razorpay API refund when applicable.
    """
    if request.method == "PUT":
        if not refund_id:
            return Response({"error": "Refund ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refund = Refund.objects.select_related("payment", "order").get(id=refund_id)
        except Refund.DoesNotExist:
            return Response({"error": "Refund not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = str(request.data.get("status", "")).strip().lower()
        allowed_statuses = ["pending", "approved", "processed", "rejected"]

        if new_status not in allowed_statuses:
            return Response(
                {"error": f"Invalid refund status. Allowed: {allowed_statuses}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Trigger actual Razorpay refund when transitioning to approved or processed
        if new_status in ["approved", "processed"] and refund.status not in ["approved", "processed"]:
            if refund.payment.payment_method == "razorpay" and refund.payment.razorpay_payment_id:
                try:
                    notes = {
                        "corvun_refund_id": str(refund.id),
                        "order_number": str(refund.order.order_number),
                        "reason": str(refund.reason)[:100],
                    }
                    rzp_res = razorpay_service.create_refund(
                        razorpay_payment_id=refund.payment.razorpay_payment_id,
                        amount=refund.amount,
                        notes=notes
                    )
                    refund.razorpay_refund_id = rzp_res.get("id")
                    refund.arn = rzp_res.get("acquirer_data", {}).get("arn") or ""
                    refund.gateway_response = rzp_res
                    new_status = "processed"
                    refund.processed_at = timezone.now()
                except Exception as e:
                    logger.error(f"Razorpay refund initiation failed for refund #{refund.id}: {e}")
                    return Response(
                        {"error": f"Gateway refund failed: {str(e)}"},
                        status=status.HTTP_502_BAD_GATEWAY
                    )

        refund.status = new_status
        if new_status == "processed" and not refund.processed_at:
            refund.processed_at = timezone.now()
        refund.save()

        # Update parent payment if fully refunded
        total_processed_refunds = Refund.objects.filter(
            payment=refund.payment,
            status="processed"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        if total_processed_refunds >= refund.payment.amount:
            refund.payment.status = "refunded"
            refund.payment.save(update_fields=["status", "updated_at"])

        serializer = RefundSerializer(refund)
        return Response(
            {
                "message": "Refund status updated successfully.",
                "refund": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # GET Request: Filtered list & KPI aggregations
    refunds_qs = (
        Refund.objects
        .select_related("payment__user", "order")
        .order_by("-created_at")
    )

    search = request.query_params.get("search", "").strip()
    if search:
        refunds_qs = refunds_qs.filter(
            Q(refund_id__icontains=search)
            | Q(order__order_number__icontains=search)
            | Q(payment__user__full_name__icontains=search)
            | Q(payment__user__email__icontains=search)
            | Q(razorpay_refund_id__icontains=search)
        ).distinct()

    status_param = request.query_params.get("status", "").strip().lower()
    if status_param and status_param != "all":
        refunds_qs = refunds_qs.filter(status=status_param)

    all_refunds = Refund.objects.all()
    total_refunds_count = all_refunds.count()
    pending_refunds_count = all_refunds.filter(status="pending").count()
    approved_processed_count = all_refunds.filter(status__in=["approved", "processed"]).count()
    total_refund_amount_agg = all_refunds.aggregate(total=Sum("amount"))
    total_refund_amount = float(total_refund_amount_agg["total"]) if total_refund_amount_agg["total"] else 0.0

    def serialize_refund(r):
        user = r.payment.user if r.payment else None
        return {
            "id": r.id,
            "refund_id_display": r.refund_id if r.refund_id else f"REF-{r.id}",
            "order_id": r.order.id,
            "order_number": r.order.order_number,
            "customer_name": (user.full_name or user.email) if user else "—",
            "customer_email": user.email if user else "—",
            "customer_phone": getattr(user, "phone", "") if user else "",
            "amount": float(r.amount),
            "gateway": r.gateway,
            "reason": r.reason,
            "status": r.status,
            "razorpay_refund_id": r.razorpay_refund_id or "",
            "arn": r.arn or "",
            "created_at": r.created_at.strftime("%Y-%m-%d"),
            "processed_at": r.processed_at.strftime("%Y-%m-%d") if r.processed_at else None,
        }

    data = [serialize_refund(r) for r in refunds_qs]

    return Response(
        {
            "refunds": data,
            "count": len(data),
            "summary": {
                "total_refunds": total_refunds_count,
                "pending_refunds": pending_refunds_count,
                "approved_processed": approved_processed_count,
                "total_refund_amount": total_refund_amount,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# 7. ADMIN REFUND DETAIL (GET /api/payments/admin/refunds/<id>/detail/)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_refund_detail(request, refund_id):
    """Full detail view for admin modal."""
    try:
        refund = (
            Refund.objects
            .select_related("payment__user", "order")
            .prefetch_related("order__items")
            .get(id=refund_id)
        )
    except Refund.DoesNotExist:
        return Response({"error": "Refund not found."}, status=status.HTTP_404_NOT_FOUND)

    user = refund.payment.user if refund.payment else None
    order = refund.order
    payment = refund.payment

    shipping_address = None
    if order and order.shipping_address_id:
        from accounts.models import Address
        try:
            addr = Address.objects.get(id=order.shipping_address_id)
            shipping_address = {
                "full_name": addr.full_name,
                "phone": addr.phone,
                "address_line1": addr.address_line1,
                "address_line2": addr.address_line2,
                "city": addr.city,
                "state": addr.state,
                "postal_code": addr.postal_code,
                "country": addr.country,
            }
        except Address.DoesNotExist:
            pass

    items = []
    if order:
        for item in order.items.all():
            items.append({
                "product_name": item.product_name,
                "variant_name": item.variant_name,
                "sku": item.sku,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "discount_amount": float(item.discount_amount),
                "tax_amount": float(item.tax_amount),
                "total_amount": float(item.total_amount),
            })

    detail = {
        "id": refund.id,
        "refund_id_display": refund.refund_id if refund.refund_id else f"REF-{refund.id}",
        "amount": float(refund.amount),
        "gateway": refund.gateway,
        "reason": refund.reason,
        "status": refund.status,
        "razorpay_refund_id": refund.razorpay_refund_id or "",
        "arn": refund.arn or "",
        "created_at": refund.created_at.strftime("%Y-%m-%d"),
        "processed_at": refund.processed_at.strftime("%Y-%m-%d") if refund.processed_at else None,
        "customer": {
            "name": (user.full_name or user.email) if user else "—",
            "email": user.email if user else "—",
            "phone": getattr(user, "phone", "") if user else "",
        },
        "shipping_address": shipping_address,
        "payment": {
            "id": payment.id if payment else None,
            "method": payment.payment_method if payment else "—",
            "amount": float(payment.amount) if payment else 0.0,
            "currency": payment.currency if payment else "INR",
            "status": payment.status if payment else "—",
            "razorpay_order_id": payment.razorpay_order_id if payment else "",
            "razorpay_payment_id": payment.razorpay_payment_id if payment else "",
        },
        "order": {
            "id": order.id if order else None,
            "order_number": order.order_number if order else "—",
            "created_at": order.created_at.strftime("%Y-%m-%d") if order else "—",
            "subtotal": float(order.subtotal) if order else 0.0,
            "shipping_amount": float(order.shipping_amount) if order else 0.0,
            "tax_amount": float(order.tax_amount) if order else 0.0,
            "total_amount": float(order.total_amount) if order else 0.0,
            "items": items,
        },
    }

    return Response({"refund": detail}, status=status.HTTP_200_OK)


# ============================================================
# 8. ADMIN PAYMENTS LIST + KPIS (GET /api/payments/admin/payments/)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_payments(request):
    """
    Returns admin payments list with verified PostgreSQL aggregation.
    Includes Razorpay identifiers, currency, and accurate revenue metrics.
    """
    payments_qs = (
        Payment.objects
        .select_related("user", "order")
        .order_by("-created_at")
    )

    search = request.query_params.get("search", "").strip()
    if search:
        payments_qs = payments_qs.filter(
            Q(order__order_number__icontains=search)
            | Q(user__full_name__icontains=search)
            | Q(user__email__icontains=search)
            | Q(payment_method__icontains=search)
            | Q(razorpay_order_id__icontains=search)
            | Q(razorpay_payment_id__icontains=search)
        ).distinct()

    status_param = request.query_params.get("status", "").strip().lower()
    if status_param and status_param != "all":
        payments_qs = payments_qs.filter(status=status_param)

    # Real aggregations
    all_payments = Payment.objects.all()
    total_transactions = all_payments.count()
    revenue_agg = all_payments.filter(
        status__in=["completed", "success", "paid"]
    ).aggregate(total=Sum("amount"))
    total_revenue = float(revenue_agg["total"]) if revenue_agg["total"] else 0.0

    refund_agg = Refund.objects.filter(
        status__in=["approved", "processed"]
    ).aggregate(total=Sum("amount"))
    total_refunds = float(refund_agg["total"]) if refund_agg["total"] else 0.0

    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size")
    paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

    def serialize_payment(p):
        return {
            "id": p.id,
            "payment_id_display": f"PAY-{p.id}",
            "order_id": p.order.id,
            "order_number": p.order.order_number,
            "customer_name": p.user.full_name or p.user.email,
            "customer_email": p.user.email,
            "amount": float(p.amount),
            "currency": p.currency,
            "payment_method": p.payment_method,
            "status": p.status,
            "razorpay_order_id": p.razorpay_order_id or "",
            "razorpay_payment_id": p.razorpay_payment_id or "",
            "created_at": p.created_at.strftime("%Y-%m-%d"),
            "updated_at": p.updated_at.strftime("%Y-%m-%d") if hasattr(p, "updated_at") and p.updated_at else None,
        }

    if page or page_size or paginate:
        paginator = PageNumberPagination()
        paginator.page_size = int(page_size) if page_size and page_size.isdigit() else 10
        result_page = paginator.paginate_queryset(payments_qs, request)
        data = [serialize_payment(p) for p in result_page]
        resp = paginator.get_paginated_response(data)
        resp.data["stats"] = {
            "total_transactions": total_transactions,
            "total_revenue": total_revenue,
            "total_refunds": total_refunds,
        }
        return resp

    data = [serialize_payment(p) for p in payments_qs]
    return Response(
        {
            "payments": data,
            "count": payments_qs.count(),
            "stats": {
                "total_transactions": total_transactions,
                "total_revenue": total_revenue,
                "total_refunds": total_refunds,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# 9. ADMIN PAYMENT DETAIL (GET /api/payments/admin/payments/<id>/)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_payment_detail(request, payment_id):
    """Detailed view for single payment."""
    try:
        p = Payment.objects.select_related("user", "order").get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = PaymentSerializer(p)
    return Response({"payment": serializer.data}, status=status.HTTP_200_OK)
