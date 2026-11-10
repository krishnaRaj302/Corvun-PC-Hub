import os
import uuid
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsAdmin
from .models import Banner
from .serializers import BannerSerializer
from .validators import validate_banner_image_file


def _handle_banner_upload(file_obj):
    """
    Validates uploaded banner file and writes it to media/banners.
    Returns the media URL path string.
    """
    validate_banner_image_file(file_obj)
    safe_name = f"{uuid.uuid4().hex[:12]}_{file_obj.name.replace(' ', '_')}"
    banners_dir = os.path.join(settings.MEDIA_ROOT, "banners")
    os.makedirs(banners_dir, exist_ok=True)
    file_path = os.path.join(banners_dir, safe_name)
    with open(file_path, "wb+") as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)
    return f"/media/banners/{safe_name}"


def _remove_banner_media_file(image_path):
    """
    Safely cleans up an uploaded banner file from disk.
    """
    if not image_path or not isinstance(image_path, str):
        return
    try:
        if image_path.startswith("/media/"):
            rel_path = image_path[len("/media/"):]
            full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
            if os.path.isfile(full_path):
                os.remove(full_path)
    except Exception:
        pass


# ============================================================
# PUBLIC BANNER API (Active & Scheduled Banners)
# ============================================================
@api_view(["GET"])
@permission_classes([AllowAny])
def banner_list(request):
    today = timezone.now().date()

    # Public website gets only active banners within their scheduled date window
    banners = Banner.objects.filter(
        status="active"
    ).filter(
        Q(start_date__isnull=True) | Q(start_date__lte=today),
        Q(end_date__isnull=True) | Q(end_date__gte=today),
    ).order_by("sort_order", "-created_at")

    serializer = BannerSerializer(banners, many=True)

    return Response(
        {"banners": serializer.data},
        status=status.HTTP_200_OK
    )


# ============================================================
# ADMIN BANNER MANAGEMENT API (CRUD)
# ============================================================
@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAdmin])
def admin_banners(request, banner_id=None):
    # ----------------------------------------------------
    # GET: Single Banner Detail or Paginated List
    # ----------------------------------------------------
    if request.method == "GET":
        if banner_id:
            try:
                banner = Banner.objects.get(id=banner_id)
            except Banner.DoesNotExist:
                return Response(
                    {"error": "Banner not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = BannerSerializer(banner)
            return Response({"banner": serializer.data}, status=status.HTTP_200_OK)

        banners_qs = Banner.objects.all().order_by("sort_order", "-created_at")
        total_count = banners_qs.count()

        # Pagination
        page_size_str = request.query_params.get("page_size", "10")
        try:
            page_size = max(1, min(100, int(page_size_str)))
        except ValueError:
            page_size = 10

        page_str = request.query_params.get("page", "1")
        try:
            current_page = max(1, int(page_str))
        except ValueError:
            current_page = 1

        total_pages = max(1, (total_count + page_size - 1) // page_size) if total_count > 0 else 1
        start_idx = (current_page - 1) * page_size
        end_idx = start_idx + page_size

        paged_banners = banners_qs[start_idx:end_idx]
        serializer = BannerSerializer(paged_banners, many=True)

        return Response(
            {
                "banners": serializer.data,
                "count": total_count,
                "page": current_page,
                "page_size": page_size,
                "total_pages": total_pages,
            },
            status=status.HTTP_200_OK
        )

    # ----------------------------------------------------
    # POST: Admin Creates a New Banner
    # ----------------------------------------------------
    if request.method == "POST":
        data = {k: v for k, v in request.data.items()}

        # Handle image upload if a file was provided
        file_obj = request.FILES.get("image")
        if file_obj:
            try:
                uploaded_image_url = _handle_banner_upload(file_obj)
                data["image"] = uploaded_image_url
            except Exception as e:
                err_msg = str(e)
                if hasattr(e, "detail"):
                    err_msg = str(e.detail[0]) if isinstance(e.detail, list) else str(e.detail)
                return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)
        elif not data.get("image"):
            return Response(
                {"error": "Banner image file is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse empty string dates to None
        if data.get("start_date") == "":
            data["start_date"] = None
        if data.get("end_date") == "":
            data["end_date"] = None

        serializer = BannerSerializer(data=data)
        if serializer.is_valid():
            banner = serializer.save()
            return Response(
                {
                    "message": "Banner created successfully.",
                    "banner": BannerSerializer(banner).data,
                },
                status=status.HTTP_201_CREATED
            )

        # If serializer validation failed and file was uploaded, clean up file
        if file_obj and "image" in data:
            _remove_banner_media_file(data["image"])

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Check banner ID for PUT, PATCH, and DELETE
    if not banner_id:
        return Response(
            {"error": "Banner ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        banner = Banner.objects.get(id=banner_id)
    except Banner.DoesNotExist:
        return Response(
            {"error": "Banner not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # ----------------------------------------------------
    # PUT / PATCH: Admin Updates a Banner
    # ----------------------------------------------------
    if request.method in ["PUT", "PATCH"]:
        data = {k: v for k, v in request.data.items()}

        old_image = banner.image
        new_file_uploaded = False

        file_obj = request.FILES.get("image")
        if file_obj:
            try:
                uploaded_image_url = _handle_banner_upload(file_obj)
                data["image"] = uploaded_image_url
                new_file_uploaded = True
            except Exception as e:
                err_msg = str(e)
                if hasattr(e, "detail"):
                    err_msg = str(e.detail[0]) if isinstance(e.detail, list) else str(e.detail)
                return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)
        elif "image" not in data or not data.get("image"):
            # Retain current image if no new file or string given
            data["image"] = old_image

        # Parse empty string dates to None
        if "start_date" in data and data.get("start_date") == "":
            data["start_date"] = None
        if "end_date" in data and data.get("end_date") == "":
            data["end_date"] = None

        serializer = BannerSerializer(banner, data=data, partial=(request.method == "PATCH"))
        if serializer.is_valid():
            updated_banner = serializer.save()

            # Clean up old image if a new one was uploaded and differs
            if new_file_uploaded and old_image and old_image != updated_banner.image:
                _remove_banner_media_file(old_image)

            return Response(
                {
                    "message": "Banner updated successfully.",
                    "banner": BannerSerializer(updated_banner).data,
                },
                status=status.HTTP_200_OK
            )

        # If validation fails and new file was saved, remove the new file
        if new_file_uploaded:
            _remove_banner_media_file(data["image"])

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ----------------------------------------------------
    # DELETE: Admin Deletes a Banner
    # ----------------------------------------------------
    if request.method == "DELETE":
        old_image = banner.image
        banner.delete()
        _remove_banner_media_file(old_image)

        return Response(
            {"message": "Banner deleted successfully."},
            status=status.HTTP_200_OK
        )