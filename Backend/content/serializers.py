from rest_framework import serializers
from .models import Banner


class BannerSerializer(serializers.ModelSerializer):

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
