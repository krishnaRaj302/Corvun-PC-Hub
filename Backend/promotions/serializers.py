from rest_framework import serializers
from .models import Coupon


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