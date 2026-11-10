from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from rest_framework.pagination import PageNumberPagination

from orders.models import Order
from promotions.models import Coupon
from .models import Payment,Refund
from .serializers import PaymentSerializer,RefundSerializer
from accounts.permissions import IsAdmin


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_payment(request):

    # Get order ID from the request
    order_id = request.data.get("order_id")

    # Get payment method from the request
    payment_method = request.data.get("payment_method")

    # Get optional coupon ID
    coupon_id = request.data.get("coupon_id")

    # Check order ID
    if not order_id:
        return Response(
            {"error": "Order ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check payment method
    if not payment_method:
        return Response(
            {"error": "Payment method is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check payment method
    if payment_method not in ["razorpay", "cod"]:
        return Response(
            {"error": "Invalid payment method."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the user's order
    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get coupon if provided
    coupon = None

    if coupon_id:
        try:
            coupon = Coupon.objects.get(
                id=coupon_id,
                status="active"
            )
        except Coupon.DoesNotExist:
            return Response(
                {"error": "Invalid coupon."},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Create payment
    payment = Payment.objects.create(
        user=request.user,
        order=order,
        coupon=coupon,
        payment_method=payment_method,
        amount=order.total_amount,
        status="pending"
    )

    # Update order payment status
    order.payment_status = "pending"
    order.save()

    # Convert payment to JSON
    serializer = PaymentSerializer(payment)

    # Return payment
    return Response(
        {
            "message": "Payment created successfully.",
            "payment": serializer.data
        },
        status=status.HTTP_201_CREATED
    )
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_refund(request):

    payment_id = request.data.get("payment_id")
    reason = request.data.get("reason")

    # Check payment ID
    if not payment_id:
        return Response(
            {"error": "Payment ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check refund reason
    if not reason:
        return Response(
            {"error": "Refund reason is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the user's payment
    try:
        payment = Payment.objects.get(
            id=payment_id,
            user=request.user
        )
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Create refund
    refund = Refund.objects.create(
        payment=payment,
        order=payment.order,
        amount=payment.amount,
        gateway=payment.payment_method,
        reason=reason,
        status="pending"
    )

    # Convert refund to JSON
    serializer = RefundSerializer(refund)

    return Response(
        {
            "message": "Refund request created successfully.",
            "refund": serializer.data
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["GET", "PUT"])
@permission_classes([IsAdmin])
def admin_refunds(request, refund_id=None):

    # PUT → Update refund status (existing behaviour unchanged)
    if request.method == "PUT":

        if not refund_id:
            return Response(
                {"error": "Refund ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refund = Refund.objects.get(id=refund_id)
        except Refund.DoesNotExist:
            return Response(
                {"error": "Refund not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Status is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_statuses = ["pending", "approved", "processed", "rejected"]

        if new_status not in allowed_statuses:
            return Response(
                {"error": "Invalid refund status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        refund.status = new_status
        refund.save()

        serializer = RefundSerializer(refund)

        return Response(
            {
                "message": "Refund status updated successfully.",
                "refund": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # GET → Enriched refund list with stats
    refunds_qs = (
        Refund.objects
        .select_related("payment__user", "order")
        .order_by("-created_at")
    )

    # Search
    search = request.query_params.get("search", "").strip()
    if search:
        refunds_qs = refunds_qs.filter(
            Q(refund_id__icontains=search)
            | Q(order__order_number__icontains=search)
            | Q(payment__user__full_name__icontains=search)
            | Q(payment__user__email__icontains=search)
        ).distinct()

    # Status filter
    status_param = request.query_params.get("status", "").strip().lower()
    if status_param and status_param != "all":
        refunds_qs = refunds_qs.filter(status=status_param)

    # Summary stats (always unfiltered)
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
            "customer_phone": user.phone if user else "",
            "amount": float(r.amount),
            "gateway": r.gateway,
            "reason": r.reason,
            "status": r.status,
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


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_refund_detail(request, refund_id):
    """
    Full refund detail for admin modal.
    Includes customer info, payment method, order items, address.
    No model changes — uses existing relationships.
    """
    try:
        refund = (
            Refund.objects
            .select_related("payment__user", "order")
            .prefetch_related("order__items")
            .get(id=refund_id)
        )
    except Refund.DoesNotExist:
        return Response(
            {"error": "Refund not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    user = refund.payment.user if refund.payment else None
    order = refund.order
    payment = refund.payment

    # Shipping address
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

    # Order items
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
        "created_at": refund.created_at.strftime("%Y-%m-%d"),
        "processed_at": refund.processed_at.strftime("%Y-%m-%d") if refund.processed_at else None,
        "customer": {
            "name": (user.full_name or user.email) if user else "—",
            "email": user.email if user else "—",
            "phone": user.phone if user else "",
        },
        "shipping_address": shipping_address,
        "payment": {
            "id": payment.id if payment else None,
            "method": payment.payment_method if payment else "—",
            "amount": float(payment.amount) if payment else 0.0,
            "status": payment.status if payment else "—",
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
# ADMIN PAYMENTS LIST + STATS
# GET /api/payments/admin/payments/
# Protected: IsAdmin only
# ============================================================

class AdminPaymentSerializer:
    """Inline lightweight serializer to avoid model changes."""
    pass


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_payments(request):
    """
    Returns admin payments list with KPI stats.
    No fake data. Real PostgreSQL aggregation only.
    """
    payments_qs = (
        Payment.objects
        .select_related("user", "order")
        .order_by("-created_at")
    )

    # 1. Search
    search = request.query_params.get("search", "").strip()
    if search:
        payments_qs = payments_qs.filter(
            Q(order__order_number__icontains=search)
            | Q(user__full_name__icontains=search)
            | Q(user__email__icontains=search)
            | Q(payment_method__icontains=search)
        ).distinct()

    # 2. Status filter
    status_param = request.query_params.get("status", "").strip().lower()
    if status_param and status_param != "all":
        payments_qs = payments_qs.filter(status=status_param)

    # 3. KPI aggregations (computed before pagination, on unfiltered base)
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

    # 4. Pagination
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
            "payment_method": p.payment_method,
            "status": p.status,
            "created_at": p.created_at.strftime("%Y-%m-%d"),
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


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_payment_detail(request, payment_id):
    """Single payment detail for admin."""
    try:
        p = Payment.objects.select_related("user", "order").get(id=payment_id)
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = PaymentSerializer(p)
    return Response({"payment": serializer.data}, status=status.HTTP_200_OK)