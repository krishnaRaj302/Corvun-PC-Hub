from rest_framework import serializers


# =========================
# Review Validators
# =========================

def validate_rating(value):
    if value < 1 or value > 5:
        raise serializers.ValidationError(
            "Rating must be between 1 and 5."
        )

    return value


def validate_review_title(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Review title cannot be empty."
        )

    return value


def validate_review_comment(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Review comment cannot be empty."
        )

    return value