from rest_framework import serializers


# =========================
# Payment Validators
# =========================

def validate_payment_amount(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Payment amount must be greater than 0."
        )

    return value


def validate_payment_method(value):
    value = value.strip().lower()

    if not value:
        raise serializers.ValidationError(
            "Payment method cannot be empty."
        )

    allowed_methods = ["razorpay", "cod"]

    if value not in allowed_methods:
        raise serializers.ValidationError(
            "Invalid payment method."
        )

    return value


# =========================
# Refund Validators
# =========================

def validate_refund_amount(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Refund amount must be greater than 0."
        )

    return value


def validate_refund_reason(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Refund reason cannot be empty."
        )

    return value


def validate_gateway(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Gateway cannot be empty."
        )

    return value