from django.urls import path
from .views import create_ticket, my_tickets, admin_tickets


urlpatterns = [

    path("create/", create_ticket, name="create_ticket"),
    path("my-tickets/", my_tickets, name="my_tickets"),
    path("admin/", admin_tickets, name="admin_tickets"),
    path("admin/<int:ticket_id>/", admin_tickets, name="admin_ticket_detail"),
]