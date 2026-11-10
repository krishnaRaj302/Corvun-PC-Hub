from rest_framework import serializers

from .models import Banner
from .validators import (
    validate_banner_title,
    validate_banner_image,
    validate_banner_link,
    validate_sort_order,
)


class BannerSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        validators=[validate_banner_title]
    )

    image = serializers.CharField(
        validators=[validate_banner_image]
    )

    cta_text = serializers.CharField(
        required=False,
        allow_blank=True,
        default="Shop Now"
    )

    link = serializers.CharField(
        validators=[validate_banner_link],
        required=False,
        allow_blank=True,
        default="/products"
    )

    status = serializers.ChoiceField(
        choices=Banner.STATUS_CHOICES,
        default="active"
    )

    start_date = serializers.DateField(
        required=False,
        allow_null=True
    )

    end_date = serializers.DateField(
        required=False,
        allow_null=True
    )

    sort_order = serializers.IntegerField(
        validators=[validate_sort_order],
        required=False,
        default=0
    )

    class Meta:
        model = Banner
        fields = [
            "id",
            "title",
            "image",
            "cta_text",
            "link",
            "status",
            "start_date",
            "end_date",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        start_date = data.get("start_date") or getattr(self.instance, "start_date", None)
        end_date = data.get("end_date") or getattr(self.instance, "end_date", None)

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be earlier than start date."}
            )

        return data