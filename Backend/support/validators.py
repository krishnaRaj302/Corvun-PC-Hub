from rest_framework import serializers


# =========================
# Support Ticket Validators
# =========================

def validate_subject(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Subject cannot be empty."
        )

    if len(value) < 3:
        raise serializers.ValidationError(
            "Subject must contain at least 3 characters."
        )

    return value


def validate_priority(value):
    value = value.strip().lower()

    if not value:
        raise serializers.ValidationError(
            "Priority cannot be empty."
        )

    allowed_priorities = [
        "low",
        "medium",
        "high",
    ]

    if value not in allowed_priorities:
        raise serializers.ValidationError(
            "Invalid priority."
        )

    return value