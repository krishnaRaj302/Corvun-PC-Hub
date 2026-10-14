from rest_framework import serializers


# =========================
# Order Validators
# =========================

def validate_amount(value):
    if value < 0:
        raise serializers.ValidationError(
            "Amount cannot be negative."
        )

    return value


def validate_total_amount(value):
    if value < 0:
        raise serializers.ValidationError(
            "Total amount cannot be negative."
        )

    return value


# =========================
# Order Item Validators
# =========================

def validate_item_quantity(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Quantity must be greater than 0."
        )

    return value


def validate_unit_price(value):
    if value < 0:
        raise serializers.ValidationError(
            "Unit price cannot be negative."
        )

    return value


def validate_item_discount(value):
    if value < 0:
        raise serializers.ValidationError(
            "Discount amount cannot be negative."
        )

    return value


def validate_item_tax(value):
    if value < 0:
        raise serializers.ValidationError(
            "Tax amount cannot be negative."
        )

    return value


def validate_item_total(value):
    if value < 0:
        raise serializers.ValidationError(
            "Total amount cannot be negative."
        )

    return value