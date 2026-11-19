from rest_framework import serializers

from .models import Payment, Refund

from .validators import (
    validate_payment_amount,
    validate_payment_method,
    validate_refund_amount,
    validate_refund_reason,
    validate_gateway,
)


# =========================
# Payment Serializer
# =========================

class PaymentSerializer(serializers.ModelSerializer):

    payment_method = serializers.CharField(
        validators=[validate_payment_method]
    )

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_payment_amount]
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "user",
            "order",
            "coupon",
            "payment_method",
            "amount",
            "currency",
            "status",
            "razorpay_order_id",
            "razorpay_payment_id",
            "razorpay_signature",
            "error_code",
            "error_description",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]


# =========================
# Refund Serializer
# =========================

class RefundSerializer(serializers.ModelSerializer):

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_refund_amount]
    )

    gateway = serializers.CharField(
        validators=[validate_gateway]
    )

    reason = serializers.CharField(
        validators=[validate_refund_reason]
    )

    class Meta:
        model = Refund
        fields = [
            "id",
            "payment",
            "order",
            "return_request_id",
            "refund_id",
            "amount",
            "gateway",
            "reason",
            "status",
            "razorpay_refund_id",
            "arn",
            "gateway_response",
            "created_at",
            "processed_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "processed_at",
        ]