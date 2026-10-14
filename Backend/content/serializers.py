from rest_framework import serializers

from .models import Banner

from .validators import (
    validate_banner_title,
    validate_banner_image,
    validate_banner_link,
    validate_sort_order,
)


# =========================
# Banner Serializer
# =========================

class BannerSerializer(serializers.ModelSerializer):

    title = serializers.CharField(
        validators=[validate_banner_title]
    )

    image = serializers.CharField(
        validators=[validate_banner_image]
    )

    link = serializers.CharField(
        validators=[validate_banner_link],
        required=False,
        allow_blank=True
    )

    sort_order = serializers.IntegerField(
        validators=[validate_sort_order]
    )

    class Meta:
        model = Banner

        fields = [
            "id",
            "title",
            "image",
            "link",
            "status",
            "sort_order",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]