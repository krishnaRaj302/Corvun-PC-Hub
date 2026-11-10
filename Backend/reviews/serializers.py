from rest_framework import serializers

from .models import Review

from .validators import (
    validate_rating,
    validate_review_title,
    validate_review_comment,
)


# =========================
# Review Serializer
# =========================

class ReviewSerializer(serializers.ModelSerializer):

    rating = serializers.IntegerField(
        validators=[validate_rating]
    )

    title = serializers.CharField(
        validators=[validate_review_title]
    )

    comment = serializers.CharField(
        validators=[validate_review_comment]
    )

    user_name = serializers.SerializerMethodField(read_only=True)
    user_email = serializers.SerializerMethodField(read_only=True)
    product_name = serializers.SerializerMethodField(read_only=True)
    product_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "product",
            "product_name",
            "product_details",
            "rating",
            "title",
            "comment",
            "images",
            "status",
            "helpful_votes",
            "not_helpful_votes",
            "moderation_notes",
            "is_edited",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "product_name",
            "product_details",
            "is_edited",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        if not obj.user:
            return "Anonymous"
        return obj.user.full_name or obj.user.email

    def get_user_email(self, obj):
        if not obj.user:
            return "—"
        return obj.user.email

    def get_product_name(self, obj):
        if not obj.product:
            return "—"
        return obj.product.product_name

    def get_product_details(self, obj):
        if not obj.product:
            return None
        p = obj.product
        first_img = p.images.first() if hasattr(p, "images") else None
        return {
            "id": p.id,
            "product_name": p.product_name,
            "sku": getattr(p, "sku", ""),
            "category": p.category.name if getattr(p, "category", None) else "—",
            "brand": p.brand.name if getattr(p, "brand", None) else "—",
            "base_price": str(getattr(p, "base_price", "0.00")),
            "stock": getattr(p, "stock", 0),
            "status": getattr(p, "status", "active"),
            "image": first_img.image if first_img else "",
        }