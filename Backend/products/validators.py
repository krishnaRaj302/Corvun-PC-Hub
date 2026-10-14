from rest_framework import serializers


# =========================
# Product Validators
# =========================

def validate_product_name(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Product name cannot be empty."
        )

    if len(value) < 2:
        raise serializers.ValidationError(
            "Product name must contain at least 2 characters."
        )

    return value


def validate_price(value):
    if value <= 0:
        raise serializers.ValidationError(
            "Price must be greater than 0."
        )

    return value


def validate_stock(value):
    if value < 0:
        raise serializers.ValidationError(
            "Stock cannot be negative."
        )

    return value


def validate_low_stock_threshold(value):
    if value < 0:
        raise serializers.ValidationError(
            "Low stock threshold cannot be negative."
        )

    return value


# =========================
# Category Validators
# =========================

def validate_category_name(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Category name cannot be empty."
        )

    if len(value) < 2:
        raise serializers.ValidationError(
            "Category name must contain at least 2 characters."
        )

    return value


# =========================
# Brand Validators
# =========================

def validate_brand_name(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Brand name cannot be empty."
        )

    if len(value) < 2:
        raise serializers.ValidationError(
            "Brand name must contain at least 2 characters."
        )

    return value


# =========================
# Variant Validators
# =========================

def validate_variant_name(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Variant name cannot be empty."
        )

    if len(value) < 2:
        raise serializers.ValidationError(
            "Variant name must contain at least 2 characters."
        )

    return value


def validate_variant_price(value):
    if value is not None and value <= 0:
        raise serializers.ValidationError(
            "Variant price must be greater than 0."
        )

    return value


def validate_variant_stock(value):
    if value < 0:
        raise serializers.ValidationError(
            "Variant stock cannot be negative."
        )

    return value


# =========================
# Product Image Validators
# =========================

def validate_image(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Image cannot be empty."
        )

    return value


def validate_image_type(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Image type cannot be empty."
        )

    return value


def validate_sort_order(value):
    if value < 0:
        raise serializers.ValidationError(
            "Sort order cannot be negative."
        )

    return value


# =========================
# Product Specification Validators
# =========================

def validate_specification_name(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Specification name cannot be empty."
        )

    return value


def validate_specification_value(value):
    value = value.strip()

    if not value:
        raise serializers.ValidationError(
            "Specification value cannot be empty."
        )

    return value