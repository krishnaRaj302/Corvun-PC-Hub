from rest_framework import serializers


# =========================
# Cart Item Validators
# =========================

def validate_quantity(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Quantity must be greater than 0."
        )

    return value