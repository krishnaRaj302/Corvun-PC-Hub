from rest_framework import serializers


# =========================
# Banner Validators
# =========================

def validate_banner_title(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Banner title cannot be empty."
        )

    if len(value) < 2:
        raise serializers.ValidationError(
            "Banner title must contain at least 2 characters."
        )

    return value


def validate_banner_image(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Banner image cannot be empty."
        )

    return value


def validate_banner_link(value):
    value = value.strip()

    return value


def validate_sort_order(value):
    if value < 0:
        raise serializers.ValidationError(
            "Sort order cannot be negative."
        )

    return value