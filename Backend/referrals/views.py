from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from rest_framework.pagination import PageNumberPagination

from accounts.permissions import IsAdmin
from accounts.models import User
from .models import Referral
from .serializers import ReferralSerializer


# Create a referral using another user's referral code
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_referral(request):

    # Get the referral code from the request
    referral_code = request.data.get("referral_code")

    # Check whether referral code is provided
    if not referral_code:
        return Response(
            {"error": "Referral code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find the user who owns this referral code
    try:
        referrer = User.objects.get(referral_code=referral_code)
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid referral code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Prevent a user from referring themselves
    if referrer.id == request.user.id:
        return Response(
            {"error": "You cannot use your own referral code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check whether this user has already used this referral
    existing_referral = Referral.objects.filter(
        referee=request.user
    ).first()

    if existing_referral:
        return Response(
            {"error": "You have already used a referral code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the referral
    referral = Referral.objects.create(
        referrer=referrer,
        referee=request.user,
        referral_code=referral_code,
        status="pending",
        reward_amount=0
    )

    # Convert referral object into JSON
    serializer = ReferralSerializer(referral)

    # Return the created referral
    return Response(
        {
            "message": "Referral created successfully.",
            "referral": serializer.data
        },
        status=status.HTTP_201_CREATED
    )


# Get the referrals connected to the logged-in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_referrals(request):

    # Get referrals where the user is either referrer or referee
    referrals = (
        Referral.objects
        .select_related("referrer", "referee", "order")
        .filter(referrer=request.user)
        | Referral.objects
        .select_related("referrer", "referee", "order")
        .filter(referee=request.user)
    )

    # Convert referrals into JSON
    serializer = ReferralSerializer(referrals, many=True)

    # Return the referrals
    return Response(
        {"referrals": serializer.data},
        status=status.HTTP_200_OK
    )


# Admin can view all referrals with KPI statistics
@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_referrals(request):

    # Base queryset with select_related for optimum PostgreSQL performance
    referrals_qs = (
        Referral.objects
        .select_related("referrer", "referee", "order")
        .order_by("-created_at")
    )

    # ── Dynamic KPI Calculations ──────────────────────────────
    total_referrals = referrals_qs.count()

    successful_conversions = referrals_qs.filter(
        status__iexact="completed"
    ).count()

    earnings_agg = referrals_qs.filter(
        status__iexact="completed"
    ).aggregate(total=Sum("reward_amount"))
    total_earnings = float(earnings_agg["total"]) if earnings_agg["total"] else 0.0

    pending_agg = referrals_qs.filter(
        status__iexact="pending"
    ).aggregate(total=Sum("reward_amount"))
    pending_rewards = float(pending_agg["total"]) if pending_agg["total"] else 0.0

    stats = {
        "total_referrals": total_referrals,
        "successful_conversions": successful_conversions,
        "total_earnings": total_earnings,
        "pending_rewards": pending_rewards,
    }

    # ── Optional Pagination ───────────────────────────────────
    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size")
    paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

    if page or page_size or paginate:
        paginator = PageNumberPagination()
        paginator.page_size = int(page_size) if page_size and page_size.isdigit() else 10
        result_page = paginator.paginate_queryset(referrals_qs, request)
        serializer = ReferralSerializer(result_page, many=True)
        resp = paginator.get_paginated_response(serializer.data)
        resp.data["referrals"] = serializer.data
        resp.data["stats"] = stats
        return resp

    # Convert referrals into JSON
    serializer = ReferralSerializer(referrals_qs, many=True)

    # Return all referrals and KPI stats to admin
    return Response(
        {
            "referrals": serializer.data,
            "results": serializer.data,
            "count": total_referrals,
            "stats": stats,
        },
        status=status.HTTP_200_OK
    )