import os
from rest_framework import serializers


# =========================
# Banner Validators
# =========================

ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def validate_banner_title(value):
    value = (value or "").strip()

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
    value = (value or "").strip()

    if not value:
        raise serializers.ValidationError(
            "Banner image cannot be empty."
        )

    return value


def validate_banner_link(value):
    return (value or "").strip()


def validate_sort_order(value):
    if value is not None and value < 0:
        raise serializers.ValidationError(
            "Sort order cannot be negative."
        )
    return value if value is not None else 0


def validate_banner_image_file(file_obj):
    """
    Validates uploaded file type and file size.
    """
    if not file_obj:
        raise serializers.ValidationError("No image file provided.")

    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise serializers.ValidationError(
            f"Invalid image format ({ext}). Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    if file_obj.size > MAX_IMAGE_SIZE_BYTES:
        raise serializers.ValidationError(
            f"Image file size ({round(file_obj.size / (1024 * 1024), 2)}MB) exceeds maximum allowed limit (5MB)."
        )

    return file_obj