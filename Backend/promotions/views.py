from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from decimal import Decimal, InvalidOperation

from .models import Coupon
from .serializers import CouponSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def validate_coupon(request):

    code = request.data.get("code")

    # Check coupon code
    if not code:
        return Response(
            {"error": "Coupon code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find coupon
    try:
        coupon = Coupon.objects.get(code=code)
    except Coupon.DoesNotExist:
        return Response(
            {"error": "Invalid coupon code."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check coupon status
    if coupon.status != "active":
        return Response(
            {"error": "This coupon is not active."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check expiry
    if coupon.expiry_date < timezone.now():
        return Response(
            {"error": "This coupon has expired."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Return coupon details
    serializer = CouponSerializer(coupon)

    return Response(
        {
            "message": "Coupon is valid.",
            "coupon": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply_coupon(request):

    code = request.data.get("code")
    amount = request.data.get("amount")

    # Check coupon code
    if not code:
        return Response(
            {"error": "Coupon code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check amount
    if not amount:
        return Response(
            {"error": "Amount is required."},
            status=status.HTTP_400_BAD_REQUEST
        )


    # Convert amount to Decimal
    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, TypeError):
        return Response(
            {"error": "Invalid amount."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check amount value
    if amount <= 0:
        return Response(
            {"error": "Amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST
        )
    # Find coupon
    try:
        coupon = Coupon.objects.get(
            code=code,
            status="active"
        )
    except Coupon.DoesNotExist:
        return Response(
            {"error": "Invalid coupon."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check expiry
    if coupon.expiry_date < timezone.now():
        return Response(
            {"error": "This coupon has expired."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calculate discount
    if coupon.discount_type == "percentage":
        discount = (amount * coupon.discount_value) / 100

    elif coupon.discount_type == "fixed":
        discount = coupon.discount_value

    else:
        return Response(
            {"error": "Invalid discount type."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Discount cannot be greater than the order amount
    if discount > amount:
        discount = amount

    final_amount = amount - discount

    return Response(
        {
            "message": "Coupon applied successfully.",
            "coupon": coupon.code,
            "discount": discount,
            "final_amount": final_amount
        },
        status=status.HTTP_200_OK
    )

