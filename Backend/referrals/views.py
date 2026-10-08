from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

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
    referrals = Referral.objects.filter(
        referrer=request.user
    ) | Referral.objects.filter(
        referee=request.user
    )

    # Convert referrals into JSON
    serializer = ReferralSerializer(referrals, many=True)

    # Return the referrals
    return Response(
        {"referrals": serializer.data},
        status=status.HTTP_200_OK
    )


# Admin can view all referrals
@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_referrals(request):

    # Get all referrals
    referrals = Referral.objects.all().order_by("-created_at")

    # Convert referrals into JSON
    serializer = ReferralSerializer(referrals, many=True)

    # Return all referrals to admin
    return Response(
        {"referrals": serializer.data},
        status=status.HTTP_200_OK
    )