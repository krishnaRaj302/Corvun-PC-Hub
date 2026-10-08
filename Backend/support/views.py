from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsAdmin
from .models import SupportTicket
from .serializers import SupportTicketSerializer


# Create a new support ticket for the logged-in user
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_ticket(request):

    # Get the subject and priority from the request
    subject = request.data.get("subject")
    priority = request.data.get("priority")

    # Check whether subject is provided
    if not subject:
        return Response(
            {"error": "Subject is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check whether priority is provided
    if not priority:
        return Response(
            {"error": "Priority is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate a unique ticket number
    ticket_number = f"TKT-{request.user.id}-{SupportTicket.objects.count() + 1}"

    # Create the support ticket
    ticket = SupportTicket.objects.create(
        user=request.user,
        ticket_number=ticket_number,
        subject=subject,
        priority=priority,
        status="open"
    )

    # Convert the ticket object into JSON format
    serializer = SupportTicketSerializer(ticket)

    # Send the created ticket to the user
    return Response(
        {
            "message": "Support ticket created successfully.",
            "ticket": serializer.data
        },
        status=status.HTTP_201_CREATED
    )


# Get all support tickets created by the logged-in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_tickets(request):

    # Get only the tickets belonging to the logged-in user
    tickets = SupportTicket.objects.filter(
        user=request.user
    ).order_by("-created_at")

    # Convert tickets into JSON format
    serializer = SupportTicketSerializer(tickets, many=True)

    # Return the user's tickets
    return Response(
        {"tickets": serializer.data},
        status=status.HTTP_200_OK
    )


# Admin can view all tickets and update ticket status
@api_view(["GET", "PUT"])
@permission_classes([IsAdmin])
def admin_tickets(request, ticket_id=None):

    # Handle GET request
    if request.method == "GET":

        # Get all support tickets
        tickets = SupportTicket.objects.all().order_by("-created_at")

        # Convert tickets into JSON format
        serializer = SupportTicketSerializer(tickets, many=True)

        # Return all tickets to the admin
        return Response(
            {"tickets": serializer.data},
            status=status.HTTP_200_OK
        )

    # Handle PUT request
    if request.method == "PUT":

        # Check whether ticket ID is provided
        if not ticket_id:
            return Response(
                {"error": "Ticket ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the ticket using the ID
        try:
            ticket = SupportTicket.objects.get(id=ticket_id)

        # If ticket does not exist
        except SupportTicket.DoesNotExist:
            return Response(
                {"error": "Ticket not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get the new status from the request
        new_status = request.data.get("status")

        # Check whether status is provided
        if not new_status:
            return Response(
                {"error": "Status is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the ticket status
        ticket.status = new_status
        ticket.save()

        # Convert updated ticket into JSON format
        serializer = SupportTicketSerializer(ticket)

        # Return the updated ticket
        return Response(
            {
                "message": "Ticket status updated successfully.",
                "ticket": serializer.data
            },
            status=status.HTTP_200_OK
        )