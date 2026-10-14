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

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "user",
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
            "ticket_number",
            "status",
            "created_at",
            "updated_at",
        ]