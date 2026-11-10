from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from decimal import Decimal, InvalidOperation

from accounts.permissions import IsAdmin
from .models import Coupon, Offer
from .serializers import CouponSerializer, OfferSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def validate_coupon(request):

    code = request.data.get("code")

    # Check coupon code
    if not code:
        return Response(
            {"error": "Coupon code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find coupon
    try:
        coupon = Coupon.objects.get(code=code)
    except Coupon.DoesNotExist:
        return Response(
            {"error": "Invalid coupon code."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check coupon status
    if coupon.status != "active":
        return Response(
            {"error": "This coupon is not active."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check expiry
    if coupon.expiry_date < timezone.now():
        return Response(
            {"error": "This coupon has expired."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Return coupon details
    serializer = CouponSerializer(coupon)

    return Response(
        {
            "message": "Coupon is valid.",
            "coupon": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply_coupon(request):

    code = request.data.get("code")
    amount = request.data.get("amount")

    # Check coupon code
    if not code:
        return Response(
            {"error": "Coupon code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check amount
    if not amount:
        return Response(
            {"error": "Amount is required."},
            status=status.HTTP_400_BAD_REQUEST
        )


    # Convert amount to Decimal
    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, TypeError):
        return Response(
            {"error": "Invalid amount."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check amount value
    if amount <= 0:
        return Response(
            {"error": "Amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST
        )
    # Find coupon
    try:
        coupon = Coupon.objects.get(
            code=code,
            status="active"
        )
    except Coupon.DoesNotExist:
        return Response(
            {"error": "Invalid coupon."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check expiry
    if coupon.expiry_date < timezone.now():
        return Response(
            {"error": "This coupon has expired."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calculate discount
    if coupon.discount_type == "percentage":
        discount = (amount * coupon.discount_value) / 100

    elif coupon.discount_type == "fixed":
        discount = coupon.discount_value

    else:
        return Response(
            {"error": "Invalid discount type."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Discount cannot be greater than the order amount
    if discount > amount:
        discount = amount

    final_amount = amount - discount

    return Response(
        {
            "message": "Coupon applied successfully.",
            "coupon": coupon.code,
            "discount": discount,
            "final_amount": final_amount
        },
        status=status.HTTP_200_OK
    )


# Customer: Get currently active offers
@api_view(["GET"])
@permission_classes([AllowAny])
def offer_list(request):

    # Get current date and time
    now = timezone.now()

    # Get only offers that are active and within their valid time
    offers = Offer.objects.filter(
        is_active=True,
        starts_at__lte=now,
        ends_at__gte=now
    ).order_by("-created_at")

    serializer = OfferSerializer(offers, many=True)

    return Response(
        {"offers": serializer.data},
        status=status.HTTP_200_OK
    )


# Admin: Create, List, Update and Delete offers
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAdmin])
def admin_offers(request, offer_id=None):

    # --------------------------------
    # GET - List all offers
    # --------------------------------
    if request.method == "GET":

        offers = Offer.objects.select_related("product", "category").order_by("-created_at")

        # 1. Search by title, product name, category name
        search = request.query_params.get("search", "").strip()
        if search:
            offers = offers.filter(
                Q(title__icontains=search) |
                Q(product__name__icontains=search) |
                Q(category__name__icontains=search)
            )

        # 2. Filter by is_active status
        status_param = request.query_params.get("status", "").strip().lower()
        if status_param == "active":
            offers = offers.filter(is_active=True)
        elif status_param == "inactive":
            offers = offers.filter(is_active=False)

        # 3. Pagination
        page_size_param = request.query_params.get("page_size", "").strip()
        page_param = request.query_params.get("page", "").strip()
        paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

        if page_param or page_size_param or paginate:
            paginator = PageNumberPagination()
            paginator.page_size = int(page_size_param) if page_size_param and page_size_param.isdigit() else 10
            result_page = paginator.paginate_queryset(offers, request)
            serializer = OfferSerializer(result_page, many=True)
            resp = paginator.get_paginated_response(serializer.data)
            resp.data["offers"] = serializer.data
            return resp

        total_count = offers.count()
        serializer = OfferSerializer(offers, many=True)

        return Response(
            {
                "offers": serializer.data,
                "count": total_count,
            },
            status=status.HTTP_200_OK
        )

    # --------------------------------
    # POST - Create offer
    # --------------------------------
    if request.method == "POST":

        serializer = OfferSerializer(data=request.data)

        if serializer.is_valid():

            apply_for = request.data.get("apply_for")
            product = request.data.get("product")
            category = request.data.get("category")

            # Product offer must have a product
            if apply_for == "product" and not product:
                return Response(
                    {"error": "Product is required for a product offer."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Category offer must have a category
            if apply_for == "category" and not category:
                return Response(
                    {"error": "Category is required for a category offer."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            offer = serializer.save()

            return Response(
                {
                    "message": "Offer created successfully.",
                    "offer": OfferSerializer(offer).data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------
    # PUT / DELETE need offer_id
    # --------------------------------
    if not offer_id:
        return Response(
            {"error": "Offer ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find offer
    try:
        offer = Offer.objects.get(id=offer_id)

    except Offer.DoesNotExist:
        return Response(
            {"error": "Offer not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # --------------------------------
    # PUT - Update offer
    # --------------------------------
    if request.method == "PUT":

        serializer = OfferSerializer(
            offer,
            data=request.data
        )

        if serializer.is_valid():

            apply_for = request.data.get(
                "apply_for",
                offer.apply_for
            )

            product = request.data.get(
                "product",
                offer.product_id
            )

            category = request.data.get(
                "category",
                offer.category_id
            )

            if apply_for == "product" and not product:
                return Response(
                    {"error": "Product is required for a product offer."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if apply_for == "category" and not category:
                return Response(
                    {"error": "Category is required for a category offer."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            offer = serializer.save()

            return Response(
                {
                    "message": "Offer updated successfully.",
                    "offer": OfferSerializer(offer).data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------
    # DELETE - Delete offer
    # --------------------------------
    if request.method == "DELETE":

        offer.delete()

        return Response(
            {"message": "Offer deleted successfully."},
            status=status.HTTP_200_OK)


# ============================================================
# Admin: Create, List, Update and Delete coupons
# ============================================================
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAdmin])
def admin_coupons(request, coupon_id=None):

    # --------------------------------
    # GET - List all coupons or get single
    # --------------------------------
    if request.method == "GET":
        if coupon_id:
            try:
                coupon = Coupon.objects.get(id=coupon_id)
            except Coupon.DoesNotExist:
                return Response(
                    {"error": "Coupon not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = CouponSerializer(coupon)
            return Response({"coupon": serializer.data}, status=status.HTTP_200_OK)

        coupons_qs = Coupon.objects.all().order_by("-created_at")

        # 1. Search by code or description
        search = request.query_params.get("search", "").strip()
        if search:
            coupons_qs = coupons_qs.filter(
                Q(code__icontains=search) | Q(description__icontains=search)
            )

        # 2. Filter by status
        status_param = request.query_params.get("status", "").strip().lower()
        now = timezone.now()
        if status_param == "active":
            coupons_qs = coupons_qs.filter(status="active", expiry_date__gte=now)
        elif status_param == "inactive":
            coupons_qs = coupons_qs.filter(status="inactive")
        elif status_param == "expired":
            coupons_qs = coupons_qs.filter(expiry_date__lt=now)
        elif status_param and status_param != "all":
            coupons_qs = coupons_qs.filter(status=status_param)

        # 3. Filter by discount_type
        discount_type = request.query_params.get("discount_type", "").strip().lower()
        if discount_type in ["percentage", "fixed"]:
            coupons_qs = coupons_qs.filter(discount_type=discount_type)

        # 4. Pagination
        page = request.query_params.get("page")
        page_size = request.query_params.get("page_size")
        paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

        if page or page_size or paginate:
            paginator = PageNumberPagination()
            paginator.page_size = int(page_size) if page_size and page_size.isdigit() else 10
            result_page = paginator.paginate_queryset(coupons_qs, request)
            serializer = CouponSerializer(result_page, many=True)
            resp = paginator.get_paginated_response(serializer.data)
            resp.data["coupons"] = serializer.data
            return resp

        serializer = CouponSerializer(coupons_qs, many=True)
        return Response(
            {
                "coupons": serializer.data,
                "results": serializer.data,
                "count": coupons_qs.count()
            },
            status=status.HTTP_200_OK
        )

    # --------------------------------
    # POST - Create coupon
    # --------------------------------
    if request.method == "POST":
        serializer = CouponSerializer(data=request.data)
        if serializer.is_valid():
            coupon = serializer.save()
            return Response(
                {
                    "message": "Coupon created successfully.",
                    "coupon": CouponSerializer(coupon).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --------------------------------
    # PUT / DELETE require coupon_id
    # --------------------------------
    if not coupon_id:
        return Response(
            {"error": "Coupon ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        coupon = Coupon.objects.get(id=coupon_id)
    except Coupon.DoesNotExist:
        return Response(
            {"error": "Coupon not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # --------------------------------
    # PUT - Update coupon
    # --------------------------------
    if request.method == "PUT":
        serializer = CouponSerializer(coupon, data=request.data, partial=True)
        if serializer.is_valid():
            updated_coupon = serializer.save()
            return Response(
                {
                    "message": "Coupon updated successfully.",
                    "coupon": CouponSerializer(updated_coupon).data
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --------------------------------
    # DELETE - Delete coupon
    # --------------------------------
    if request.method == "DELETE":
        coupon.delete()
        return Response(
            {"message": "Coupon deleted successfully."},
            status=status.HTTP_200_OK
        )