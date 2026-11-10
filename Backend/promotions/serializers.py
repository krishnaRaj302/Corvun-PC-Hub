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

    is_expired = serializers.SerializerMethodField(read_only=True)

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
            "is_expired",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "is_expired",
            "created_at",
            "updated_at",
        ]

    def get_is_expired(self, obj):
        from django.utils import timezone
        if not obj.expiry_date:
            return False
        return obj.expiry_date < timezone.now()

    def validate_code(self, value):
        value = validate_coupon_code(value)
        qs = Coupon.objects.filter(code__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("A coupon with this code already exists.")
        return value

    def validate(self, data):
        discount_type = data.get("discount_type", getattr(self.instance, "discount_type", None))
        discount_value = data.get("discount_value", getattr(self.instance, "discount_value", None))
        status_val = data.get("status", getattr(self.instance, "status", None))
        expiry_date = data.get("expiry_date", getattr(self.instance, "expiry_date", None))

        if not discount_type:
            raise serializers.ValidationError({"discount_type": "Discount type is required."})
        if discount_type not in ["percentage", "fixed"]:
            raise serializers.ValidationError({"discount_type": "Discount type must be either 'percentage' or 'fixed'."})

        if discount_value is None:
            raise serializers.ValidationError({"discount_value": "Discount value is required."})
        if discount_value <= 0:
            raise serializers.ValidationError({"discount_value": "Discount value must be greater than 0."})
        if discount_type == "percentage" and discount_value > 100:
            raise serializers.ValidationError({"discount_value": "Percentage discount cannot exceed 100%."})

        if not status_val:
            data["status"] = "active"
        elif status_val not in ["active", "inactive"]:
            raise serializers.ValidationError({"status": "Status must be either 'active' or 'inactive'."})

        if not expiry_date:
            raise serializers.ValidationError({"expiry_date": "Expiry date is required."})

        return data



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

    # Read-only fields for display in the admin list
    product_name = serializers.SerializerMethodField(read_only=True)
    category_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "title",
            "discount_value",
            "discount_type",
            "apply_for",
            "product",
            "product_name",
            "category",
            "category_name",
            "starts_at",
            "ends_at",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "product_name",
            "category_name",
            "created_at",
        ]

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
        return None

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return None

    def validate(self, data):
        discount_type = data.get(
            "discount_type",
            getattr(self.instance, "discount_type", None)
        )
        discount_value = data.get(
            "discount_value",
            getattr(self.instance, "discount_value", None)
        )
        starts_at = data.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = data.get("ends_at", getattr(self.instance, "ends_at", None))

        if not discount_type:
            raise serializers.ValidationError(
                {"discount_type": "Discount type is required."}
            )
        if discount_type not in ["percentage", "fixed"]:
            raise serializers.ValidationError(
                {"discount_type": "Discount type must be 'percentage' or 'fixed'."}
            )

        if discount_value is None:
            raise serializers.ValidationError(
                {"discount_value": "Discount value is required."}
            )
        if discount_value <= 0:
            raise serializers.ValidationError(
                {"discount_value": "Discount value must be greater than 0."}
            )
        if discount_type == "percentage" and discount_value > 100:
            raise serializers.ValidationError(
                {"discount_value": "Percentage discount cannot exceed 100%."}
            )

        if starts_at and ends_at and ends_at < starts_at:
            raise serializers.ValidationError(
                {"ends_at": "End date cannot be before start date."}
            )

        return data