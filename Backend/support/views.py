from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination

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


# Admin can view all tickets, search/filter, view single ticket, and update status
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAdmin])
def admin_tickets(request, ticket_id=None):

    # --------------------------------
    # GET: Single ticket or ticket list
    # --------------------------------
    if request.method == "GET":

        # If ticket_id is provided, return single ticket detail
        if ticket_id:
            try:
                ticket = SupportTicket.objects.select_related("user").get(id=ticket_id)
            except SupportTicket.DoesNotExist:
                return Response(
                    {"error": "Ticket not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = SupportTicketSerializer(ticket)
            return Response({"ticket": serializer.data}, status=status.HTTP_200_OK)

        # Base queryset
        tickets_qs = SupportTicket.objects.select_related("user").order_by("-created_at")

        # KPI stats on unfiltered base
        total_tickets = tickets_qs.count()
        open_tickets = tickets_qs.filter(status="open").count()
        in_progress_tickets = tickets_qs.filter(status="in_progress").count()
        resolved_tickets = tickets_qs.filter(status__in=["resolved", "closed"]).count()

        stats_data = {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "in_progress_tickets": in_progress_tickets,
            "resolved_tickets": resolved_tickets,
        }

        # 1. Search by ticket_number, subject, customer name, customer email
        search = request.query_params.get("search", "").strip()
        if search:
            tickets_qs = tickets_qs.filter(
                Q(ticket_number__icontains=search)
                | Q(subject__icontains=search)
                | Q(user__full_name__icontains=search)
                | Q(user__email__icontains=search)
            )

        # 2. Filter by status
        status_param = request.query_params.get("status", "").strip().lower()
        if status_param and status_param != "all":
            tickets_qs = tickets_qs.filter(status=status_param)

        # 3. Filter by priority
        priority_param = request.query_params.get("priority", "").strip().lower()
        if priority_param and priority_param != "all":
            tickets_qs = tickets_qs.filter(priority=priority_param)

        # 4. Pagination
        page = request.query_params.get("page")
        page_size = request.query_params.get("page_size")
        paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

        if page or page_size or paginate:
            paginator = PageNumberPagination()
            paginator.page_size = int(page_size) if page_size and page_size.isdigit() else 10
            result_page = paginator.paginate_queryset(tickets_qs, request)
            serializer = SupportTicketSerializer(result_page, many=True)
            resp = paginator.get_paginated_response(serializer.data)
            resp.data["tickets"] = serializer.data
            resp.data["stats"] = stats_data
            return resp

        serializer = SupportTicketSerializer(tickets_qs, many=True)
        return Response(
            {
                "tickets": serializer.data,
                "results": serializer.data,
                "count": tickets_qs.count(),
                "stats": stats_data,
            },
            status=status.HTTP_200_OK
        )

    # --------------------------------
    # PUT / PATCH: Update ticket status or priority
    # --------------------------------
    if request.method in ["PUT", "PATCH"]:

        if not ticket_id:
            return Response(
                {"error": "Ticket ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ticket = SupportTicket.objects.select_related("user").get(id=ticket_id)
        except SupportTicket.DoesNotExist:
            return Response(
                {"error": "Ticket not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get("status")
        new_priority = request.data.get("priority")

        if not new_status and not new_priority:
            return Response(
                {"error": "Status or priority is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status:
            new_status = new_status.strip().lower()
            allowed_statuses = ["open", "in_progress", "resolved", "closed"]
            if new_status not in allowed_statuses:
                return Response(
                    {"error": f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            ticket.status = new_status

        if new_priority:
            new_priority = new_priority.strip().lower()
            allowed_priorities = ["low", "medium", "high"]
            if new_priority not in allowed_priorities:
                return Response(
                    {"error": f"Invalid priority. Allowed values: {', '.join(allowed_priorities)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            ticket.priority = new_priority

        ticket.save()
        serializer = SupportTicketSerializer(ticket)

        return Response(
            {
                "message": "Ticket updated successfully.",
                "ticket": serializer.data
            },
            status=status.HTTP_200_OK
        )