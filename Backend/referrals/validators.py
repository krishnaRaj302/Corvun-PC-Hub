from rest_framework import serializers


# =========================
# Referral Validators
# =========================

def validate_referral_code(value):
    value = value.strip().upper()

    if not value:
        raise serializers.ValidationError(
            "Referral code cannot be empty."
        )

    if len(value) < 3:
        raise serializers.ValidationError(
            "Referral code must contain at least 3 characters."
        )

    return value