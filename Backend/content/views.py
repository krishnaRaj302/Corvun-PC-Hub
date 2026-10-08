from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsAdmin
from .models import Banner
from .serializers import BannerSerializer


# Get all active banners for the website
@api_view(["GET"])
@permission_classes([AllowAny])
def banner_list(request):

    # Get only active banners
    banners = Banner.objects.filter(
        status="active"
    ).order_by("sort_order")

    # Convert banners into JSON
    serializer = BannerSerializer(banners, many=True)

    # Return banners to the frontend
    return Response(
        {"banners": serializer.data},
        status=status.HTTP_200_OK
    )


# Admin can create, update, and delete banners
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAdmin])
def admin_banners(request, banner_id=None):

    # GET - Admin can view all banners
    if request.method == "GET":

        banners = Banner.objects.all().order_by("sort_order")

        serializer = BannerSerializer(banners, many=True)

        return Response(
            {"banners": serializer.data},
            status=status.HTTP_200_OK
        )

    # POST - Admin creates a new banner
    if request.method == "POST":

        serializer = BannerSerializer(data=request.data)

        if serializer.is_valid():
            banner = serializer.save()

            return Response(
                {
                    "message": "Banner created successfully.",
                    "banner": BannerSerializer(banner).data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check banner ID for PUT and DELETE
    if not banner_id:
        return Response(
            {"error": "Banner ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find the banner
    try:
        banner = Banner.objects.get(id=banner_id)
    except Banner.DoesNotExist:
        return Response(
            {"error": "Banner not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # PUT - Admin updates a banner
    if request.method == "PUT":

        serializer = BannerSerializer(
            banner,
            data=request.data
        )

        if serializer.is_valid():
            banner = serializer.save()

            return Response(
                {
                    "message": "Banner updated successfully.",
                    "banner": BannerSerializer(banner).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # DELETE - Admin deletes a banner
    if request.method == "DELETE":

        banner.delete()

        return Response(
            {"message": "Banner deleted successfully."},
            status=status.HTTP_200_OK
        )