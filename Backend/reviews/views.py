import csv
import datetime
from django.utils import timezone
from django.db.models import Avg, Q
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from accounts.permissions import IsAdmin

from .models import Review
from .serializers import ReviewSerializer
from products.models import Product


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_review(request):
    product_id = request.data.get("product")
    rating = request.data.get("rating")
    title = request.data.get("title")
    comment = request.data.get("comment")
    images = request.data.get("images", [])

    # Check product
    if not product_id:
        return Response(
            {"error": "Product is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check rating
    if not rating:
        return Response(
            {"error": "Rating is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        rating_val = int(rating)
        if rating_val < 1 or rating_val > 5:
            return Response(
                {"error": "Rating must be between 1 and 5."},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {"error": "Invalid rating format."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create review with default pending moderation status
    review = Review.objects.create(
        user=request.user,
        product=product,
        rating=rating_val,
        title=title or "",
        comment=comment or "",
        images=images if isinstance(images, list) else [],
        status="pending"
    )

    serializer = ReviewSerializer(review)

    return Response(
        {
            "message": "Review submitted successfully and is pending moderation.",
            "review": serializer.data
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["GET"])
def product_reviews(request, product_id):
    # Customer view: only approved reviews should show on the public product page
    reviews = Review.objects.filter(
        product_id=product_id,
        status="approved"
    ).select_related("user", "product").order_by("-created_at")

    serializer = ReviewSerializer(reviews, many=True)

    return Response(
        {"reviews": serializer.data},
        status=status.HTTP_200_OK
    )


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_review(request, review_id):
    try:
        review = Review.objects.get(
            id=review_id,
            user=request.user
        )
    except Review.DoesNotExist:
        return Response(
            {"error": "Review not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    rating = request.data.get("rating")
    title = request.data.get("title")
    comment = request.data.get("comment")
    images = request.data.get("images")

    if rating is not None:
        try:
            rating_val = int(rating)
            if rating_val < 1 or rating_val > 5:
                return Response(
                    {"error": "Rating must be between 1 and 5."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            review.rating = rating_val
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid rating format."},
                status=status.HTTP_400_BAD_REQUEST
            )

    if title is not None:
        review.title = title

    if comment is not None:
        review.comment = comment

    if images is not None and isinstance(images, list):
        review.images = images

    review.is_edited = True
    # Re-queue for moderation if edited
    review.status = "pending"
    review.save()

    serializer = ReviewSerializer(review)

    return Response(
        {
            "message": "Review updated successfully and pending moderation.",
            "review": serializer.data
        },
        status=status.HTTP_200_OK
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_review(request, review_id):
    try:
        review = Review.objects.get(
            id=review_id,
            user=request.user
        )
    except Review.DoesNotExist:
        return Response(
            {"error": "Review not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    review.delete()

    return Response(
        {"message": "Review deleted successfully."},
        status=status.HTTP_200_OK
    )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAdmin])
def admin_reviews(request, review_id=None):
    # ----------------------------------------------------
    # GET: Single Review Detail or Paginated Review List
    # ----------------------------------------------------
    if request.method == "GET":
        if review_id:
            try:
                review = Review.objects.select_related(
                    "user", "product", "product__category", "product__brand"
                ).prefetch_related("product__images").get(id=review_id)
            except Review.DoesNotExist:
                return Response(
                    {"error": "Review not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = ReviewSerializer(review)
            return Response({"review": serializer.data}, status=status.HTTP_200_OK)

        # Base queryset for all reviews
        base_qs = Review.objects.select_related(
            "user", "product", "product__category", "product__brand"
        ).prefetch_related("product__images").order_by("-created_at")

        # ── KPI Calculations from Real Database ────────────────
        total_reviews = base_qs.count()
        avg_rating_agg = base_qs.aggregate(avg=Avg("rating"))["avg"]
        average_rating = round(float(avg_rating_agg), 1) if avg_rating_agg is not None else 0.0

        pending_reviews = base_qs.filter(status="pending").count()
        reported_reviews = base_qs.filter(status="reported").count()

        # Dynamic Trend Calculations (This Month vs Last Month)
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_end = this_month_start - datetime.timedelta(seconds=1)
        last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        this_month_qs = base_qs.filter(created_at__gte=this_month_start)
        last_month_qs = base_qs.filter(created_at__gte=last_month_start, created_at__lte=last_month_end)

        this_month_count = this_month_qs.count()
        last_month_count = last_month_qs.count()

        if last_month_count > 0:
            pct_change = round(((this_month_count - last_month_count) / last_month_count) * 100)
            reviews_trend = f"{'+' if pct_change >= 0 else ''}{pct_change}% from last month"
            reviews_trend_positive = pct_change >= 0
        elif this_month_count > 0:
            reviews_trend = f"+{this_month_count} this month"
            reviews_trend_positive = True
        else:
            reviews_trend = "0% from last month"
            reviews_trend_positive = True

        this_month_avg = this_month_qs.aggregate(avg=Avg("rating"))["avg"]
        last_month_avg = last_month_qs.aggregate(avg=Avg("rating"))["avg"]

        if this_month_avg is not None and last_month_avg is not None:
            rating_diff = round(float(this_month_avg) - float(last_month_avg), 1)
            rating_trend = f"{'+' if rating_diff >= 0 else ''}{rating_diff} from last month"
            rating_trend_positive = rating_diff >= 0
        elif this_month_avg is not None:
            rating_trend = f"{round(float(this_month_avg), 1)} this month"
            rating_trend_positive = True
        else:
            rating_trend = "+0.0 from last month"
            rating_trend_positive = True

        pending_label = "Needs attention" if pending_reviews > 0 else "All caught up"
        reported_label = "Requires moderation" if reported_reviews > 0 else "No active reports"

        stats_data = {
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "pending_reviews": pending_reviews,
            "reported_reviews": reported_reviews,
            "reviews_trend": reviews_trend,
            "reviews_trend_positive": reviews_trend_positive,
            "rating_trend": rating_trend,
            "rating_trend_positive": rating_trend_positive,
            "pending_label": pending_label,
            "reported_label": reported_label,
        }

        # ── Filters ────────────────────────────────────────────
        filtered_qs = base_qs

        # 1. Search (User name, email, product name, title, comment)
        search = request.query_params.get("search", "").strip()
        if search:
            filtered_qs = filtered_qs.filter(
                Q(user__full_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(product__product_name__icontains=search)
                | Q(title__icontains=search)
                | Q(comment__icontains=search)
            )

        # 2. Status filter
        status_param = request.query_params.get("status", "").strip().lower()
        if status_param and status_param != "all":
            filtered_qs = filtered_qs.filter(status=status_param)

        # 3. Rating filter
        rating_param = request.query_params.get("rating", "").strip()
        if rating_param and rating_param != "all":
            try:
                filtered_qs = filtered_qs.filter(rating=int(rating_param))
            except ValueError:
                pass

        # ── CSV Export ─────────────────────────────────────────
        export_mode = request.query_params.get("export", "").strip().lower() in ["true", "1", "csv"]
        if export_mode:
            response = HttpResponse(content_type="text/csv")
            now_str = timezone.now().strftime("%Y-%m-%d")
            response["Content-Disposition"] = f'attachment; filename="corvun_reviews_{now_str}.csv"'

            writer = csv.writer(response)
            writer.writerow([
                "Review ID",
                "User Name",
                "User Email",
                "Product Name",
                "Product SKU",
                "Rating",
                "Title",
                "Comment",
                "Status",
                "Helpful Votes",
                "Not Helpful Votes",
                "Created At",
            ])

            for rev in filtered_qs:
                writer.writerow([
                    rev.id,
                    rev.user.full_name if rev.user else "Anonymous",
                    rev.user.email if rev.user else "—",
                    rev.product.product_name if rev.product else "—",
                    getattr(rev.product, "sku", "—"),
                    rev.rating,
                    rev.title,
                    rev.comment,
                    rev.status,
                    rev.helpful_votes,
                    rev.not_helpful_votes,
                    rev.created_at.strftime("%Y-%m-%d %H:%M:%S") if rev.created_at else "—",
                ])

            return response

        # ── Pagination ─────────────────────────────────────────
        total_filtered = filtered_qs.count()
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

        total_pages = max(1, (total_filtered + page_size - 1) // page_size) if total_filtered > 0 else 1
        start_idx = (current_page - 1) * page_size
        end_idx = start_idx + page_size

        paged_reviews = filtered_qs[start_idx:end_idx]
        serializer = ReviewSerializer(paged_reviews, many=True)

        return Response(
            {
                "reviews": serializer.data,
                "count": total_filtered,
                "page": current_page,
                "page_size": page_size,
                "total_pages": total_pages,
                "stats": stats_data,
            },
            status=status.HTTP_200_OK
        )

    # ----------------------------------------------------
    # PUT / PATCH: Moderate / Update a Review
    # ----------------------------------------------------
    if request.method in ["PUT", "PATCH"]:
        if not review_id:
            return Response(
                {"error": "Review ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            review = Review.objects.select_related(
                "user", "product", "product__category", "product__brand"
            ).prefetch_related("product__images").get(id=review_id)
        except Review.DoesNotExist:
            return Response(
                {"error": "Review not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get("status")
        moderation_notes = request.data.get("moderation_notes")
        helpful_votes = request.data.get("helpful_votes")
        not_helpful_votes = request.data.get("not_helpful_votes")

        if new_status is not None:
            new_status = str(new_status).strip().lower()
            allowed_statuses = ["pending", "approved", "rejected", "reported"]
            if new_status not in allowed_statuses:
                return Response(
                    {"error": f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            review.status = new_status

        if moderation_notes is not None:
            review.moderation_notes = str(moderation_notes)

        if helpful_votes is not None:
            try:
                review.helpful_votes = max(0, int(helpful_votes))
            except (ValueError, TypeError):
                pass

        if not_helpful_votes is not None:
            try:
                review.not_helpful_votes = max(0, int(not_helpful_votes))
            except (ValueError, TypeError):
                pass

        review.save()

        serializer = ReviewSerializer(review)
        return Response(
            {
                "message": f"Review marked as {review.status}.",
                "review": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # ----------------------------------------------------
    # DELETE: Delete a Review
    # ----------------------------------------------------
    if request.method == "DELETE":
        if not review_id:
            return Response(
                {"error": "Review ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist:
            return Response(
                {"error": "Review not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        review.delete()

        return Response(
            {"message": "Review deleted successfully."},
            status=status.HTTP_200_OK
        )