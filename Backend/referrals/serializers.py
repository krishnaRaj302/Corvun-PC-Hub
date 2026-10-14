from rest_framework import serializers

from .models import Referral

from .validators import (
    validate_referral_code,
)


# =========================
# Referral Serializer
# =========================

class ReferralSerializer(serializers.ModelSerializer):

    referral_code = serializers.CharField(
        validators=[validate_referral_code]
    )

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