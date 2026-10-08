from rest_framework import serializers
from .models import Coupon,Offer


class CouponSerializer(serializers.ModelSerializer):

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

class OfferSerializer(serializers.ModelSerializer):
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
        read_only_fields = ["id", "created_at"]