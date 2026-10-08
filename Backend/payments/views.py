from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

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

    # GET → View all refunds
    if request.method == "GET":

        refunds = Refund.objects.all().order_by("-created_at")

        serializer = RefundSerializer(refunds, many=True)

        return Response(
            {"refunds": serializer.data},
            status=status.HTTP_200_OK
        )

    # PUT → Update refund status
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

        allowed_statuses = [
            "pending",
            "approved",
            "processed",
            "rejected"
        ]

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