from rest_framework import serializers

from .models import Coupon, Offer

from .validators import (
    validate_coupon_code,
    validate_coupon_discount_value,
    validate_offer_title,
    validate_offer_discount_value,
)


# =========================
# Coupon Serializer
# =========================

class CouponSerializer(serializers.ModelSerializer):

    code = serializers.CharField(
        validators=[validate_coupon_code]
    )

    discount_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_coupon_discount_value]
    )

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "description",
            "discount_type",
            "discount_value",
            "expiry_date",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# =========================
# Offer Serializer
# =========================

class OfferSerializer(serializers.ModelSerializer):

    title = serializers.CharField(
        validators=[validate_offer_title]
    )

    discount_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_offer_discount_value]
    )

    class Meta:
        model = Offer
        fields = [
            "id",
            "title",
            "discount_value",
            "discount_type",
            "apply_for",
            "product",
            "category",
            "starts_at",
            "ends_at",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]