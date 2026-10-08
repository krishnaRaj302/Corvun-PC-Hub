from django.db import models
from accounts.models import User


class SupportTicket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="support_tickets")
    ticket_number = models.CharField(max_length=100)
    subject = models.CharField(max_length=255)
    priority = models.CharField(max_length=30)
    status = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.ticket_number