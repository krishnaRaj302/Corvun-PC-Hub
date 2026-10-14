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

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "product",
            "rating",
            "title",
            "comment",
            "images",
            "is_edited",
            "created_at",
            "updated_at",
        ]

        # The backend should automatically decide
        read_only_fields = [
            "id",
            "user",
            "is_edited",
            "created_at",
            "updated_at",
        ]