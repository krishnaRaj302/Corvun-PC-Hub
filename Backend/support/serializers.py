from rest_framework import serializers

from .models import SupportTicket

from .validators import (
    validate_subject,
    validate_priority,
)


# =========================
# Support Ticket Serializer
# =========================

class SupportTicketSerializer(serializers.ModelSerializer):

    subject = serializers.CharField(
        validators=[validate_subject]
    )

    priority = serializers.CharField(
        validators=[validate_priority]
    )

    customer_name = serializers.SerializerMethodField(read_only=True)
    customer_email = serializers.SerializerMethodField(read_only=True)
    customer_phone = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "user",
            "customer_name",
            "customer_email",
            "customer_phone",
            "ticket_number",
            "subject",
            "priority",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "customer_name",
            "customer_email",
            "customer_phone",
            "ticket_number",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        if not obj.user:
            return "—"
        return obj.user.full_name or obj.user.email

    def get_customer_email(self, obj):
        return obj.user.email if obj.user else "—"

    def get_customer_phone(self, obj):
        return getattr(obj.user, "phone", "") if obj.user else ""