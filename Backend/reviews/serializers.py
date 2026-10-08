from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):

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
        #The backend should automatically decide:
        read_only_fields = [
            "id",
            "user",
            "is_edited",
            "created_at",
            "updated_at",
        ]