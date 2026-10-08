from rest_framework import serializers
from .models import SupportTicket


class SupportTicketSerializer(serializers.ModelSerializer):

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