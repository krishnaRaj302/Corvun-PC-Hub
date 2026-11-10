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

    referral_id_display = serializers.SerializerMethodField(read_only=True)
    referrer_name = serializers.SerializerMethodField(read_only=True)
    referrer_email = serializers.SerializerMethodField(read_only=True)
    referee_name = serializers.SerializerMethodField(read_only=True)
    referee_email = serializers.SerializerMethodField(read_only=True)
    order_value = serializers.SerializerMethodField(read_only=True)
    date = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Referral

        fields = [
            "id",
            "referral_id_display",
            "referrer",
            "referrer_name",
            "referrer_email",
            "referee",
            "referee_name",
            "referee_email",
            "referral_code",
            "status",
            "reward_amount",
            "order",
            "order_value",
            "date",
            "created_at",
            "completed_at",
            "expires_at",
        ]

        read_only_fields = [
            "id",
            "referral_id_display",
            "referrer",
            "referrer_name",
            "referrer_email",
            "referee_name",
            "referee_email",
            "order_value",
            "date",
            "status",
            "reward_amount",
            "order",
            "created_at",
            "completed_at",
            "expires_at",
        ]

    def get_referral_id_display(self, obj):
        return f"REF-{obj.id:03d}" if obj.id < 1000 else f"REF-{obj.id}"

    def get_referrer_name(self, obj):
        if not obj.referrer:
            return "—"
        return obj.referrer.full_name or obj.referrer.email

    def get_referrer_email(self, obj):
        return obj.referrer.email if obj.referrer else "—"

    def get_referee_name(self, obj):
        if not obj.referee:
            return "—"
        return obj.referee.full_name or obj.referee.email

    def get_referee_email(self, obj):
        return obj.referee.email if obj.referee else "—"

    def get_order_value(self, obj):
        if obj.order and hasattr(obj.order, "total_amount"):
            return float(obj.order.total_amount)
        return None

    def get_date(self, obj):
        if obj.created_at:
            return obj.created_at.strftime("%Y-%m-%d")
        return "—"