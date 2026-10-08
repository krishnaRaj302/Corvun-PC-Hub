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

    if int(rating) < 1 or int(rating) > 5:
        return Response(
            {"error": "Rating must be between 1 and 5."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create review
    review = Review.objects.create(
        user=request.user,
        product=product,
        rating=rating,
        title=title,
        comment=comment,
        images=images
    )

    serializer = ReviewSerializer(review)

    return Response(
        {
            "message": "Review created successfully.",
            "review": serializer.data
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["GET"])
def product_reviews(request, product_id):

    reviews = Review.objects.filter(
        product_id=product_id
    ).order_by("-created_at")

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

        if int(rating) < 1 or int(rating) > 5:
            return Response(
                {"error": "Rating must be between 1 and 5."},
                status=status.HTTP_400_BAD_REQUEST
            )

        review.rating = rating

    if title is not None:
        review.title = title

    if comment is not None:
        review.comment = comment

    if images is not None:
        review.images = images

    review.is_edited = True
    review.save()

    serializer = ReviewSerializer(review)

    return Response(
        {
            "message": "Review updated successfully.",
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

@api_view(["GET", "DELETE"])
@permission_classes([IsAdmin])
def admin_reviews(request, review_id=None):

    # GET → View all reviews
    if request.method == "GET":

        reviews = Review.objects.all().order_by("-created_at")

        serializer = ReviewSerializer(reviews, many=True)

        return Response(
            {"reviews": serializer.data},
            status=status.HTTP_200_OK
        )

    # DELETE → Delete a review
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