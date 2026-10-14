from rest_framework import serializers


# =========================
# Coupon Validators
# =========================

def validate_coupon_code(value):
    value = value.strip().upper()

    if not value:
        raise serializers.ValidationError(
            "Coupon code cannot be empty."
        )

    if len(value) < 3:
        raise serializers.ValidationError(
            "Coupon code must contain at least 3 characters."
        )

    return value


def validate_coupon_discount_value(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Discount value must be greater than 0."
        )

    return value


# =========================
# Offer Validators
# =========================

def validate_offer_title(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Offer title cannot be empty."
        )

    return value


def validate_offer_discount_value(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Discount value must be greater than 0."
        )

    return value