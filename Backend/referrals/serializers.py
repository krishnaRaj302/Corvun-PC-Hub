from rest_framework import serializers
from .models import Referral


class ReferralSerializer(serializers.ModelSerializer):

    class Meta:
        model = Referral

        fields = [
            "id",
            "referrer",
            "referee",
            "referral_code",
            "status",
            "reward_amount",
            "order",
            "created_at",
            "completed_at",
            "expires_at",
        ]

        read_only_fields = [
            "id",
            "referrer",
            "status",
            "reward_amount",
            "order",
            "created_at",
            "completed_at",
            "expires_at",
        ]