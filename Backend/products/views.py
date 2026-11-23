import os
import re
import uuid
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.db.models import F, Q, Count, ProtectedError
from rest_framework.exceptions import ValidationError

from accounts.permissions import IsAdmin
from rest_framework.permissions import IsAuthenticated
from config.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
    is_cloudinary_url,
)

from .models import (
    Product,
    Category, 
    Brand,
    ProductVariant,
    ProductImage,
    ProductSpecification,
)
from .serializers import (
    ProductSerializer,
    CategorySerializer,
    BrandSerializer,
    ProductVariantSerializer,
    ProductVariant,
    ProductImageSerializer,
    ProductSpecificationSerializer,
)


@api_view(["GET"])
def product_list(request):

    products = (
        Product.objects.all()
        .select_related("brand", "category")
        .prefetch_related("images", "variants")
    )

    # 1. Search (by product name, description, brand, or category)
    search = request.query_params.get("search", "").strip()
    if search:
        products = products.filter(
            Q(product_name__icontains=search)
            | Q(sku__icontains=search)
            | Q(description__icontains=search)
            | Q(brand__name__icontains=search)
            | Q(category__name__icontains=search)
        )

    # 2. Category Filter (by id or name)
    category = request.query_params.get("category", "").strip()
    if category:
        if category.isdigit():
            products = products.filter(category_id=int(category))
        else:
            products = products.filter(category__name__iexact=category)

    # 3. Brand Filter (by id or name)
    brand = request.query_params.get("brand", "").strip()
    if brand:
        if brand.isdigit():
            products = products.filter(brand_id=int(brand))
        else:
            products = products.filter(brand__name__iexact=brand)

    # 4. Status Filter (optional)
    status_param = request.query_params.get("status", "").strip()
    if status_param:
        products = products.filter(status=status_param)

    # 5. Sorting
    sort_param = (
        request.query_params.get("ordering")
        or request.query_params.get("sort")
        or "newest"
    )

    if sort_param == "price_low":
        products = products.order_by("base_price")
    elif sort_param == "price_high":
        products = products.order_by("-base_price")
    elif sort_param == "oldest":
        products = products.order_by("created_at")
    elif sort_param == "newest":
        products = products.order_by("-created_at")
    else:
        products = products.order_by("-created_at")

    # 6. Pagination
    paginator = PageNumberPagination()
    page_size = request.query_params.get("page_size")
    if page_size and page_size.isdigit():
        paginator.page_size = int(page_size)
    else:
        paginator.page_size = 12

    result_page = paginator.paginate_queryset(products, request)

    serializer = ProductSerializer(result_page, many=True)

    return paginator.get_paginated_response(serializer.data)



@api_view(["GET"])
def category_list(request):
    categories = Category.objects.annotate(product_count=Count("products"))

    # Search filter (by name)
    search = request.query_params.get("search", "").strip()
    if search:
        categories = categories.filter(name__icontains=search)

    # Status filter (all, active, inactive)
    status_param = request.query_params.get("status", "").strip().lower()
    if status_param in ["active", "true"]:
        categories = categories.filter(status=True)
    elif status_param in ["inactive", "false"]:
        categories = categories.filter(status=False)

    categories = categories.order_by("-id")

    # Pagination: conditionally enable when requested to preserve backward compatibility
    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size")
    paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

    if page or page_size or paginate:
        paginator = PageNumberPagination()
        if page_size and page_size.isdigit():
            paginator.page_size = int(page_size)
        else:
            paginator.page_size = 8

        result_page = paginator.paginate_queryset(categories, request)
        serializer = CategorySerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CategorySerializer(categories, many=True)
    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def brand_list(request):
    brands = Brand.objects.annotate(product_count=Count("products"))

    # Search filter (by brand name)
    search = request.query_params.get("search", "").strip()
    if search:
        brands = brands.filter(name__icontains=search)

    # Status filter (all, listed, unlisted)
    status_param = request.query_params.get("status", "").strip().lower()
    if status_param in ["listed", "active"]:
        brands = brands.filter(status="listed")
    elif status_param in ["unlisted", "inactive"]:
        brands = brands.filter(status="unlisted")

    brands = brands.order_by("-id")

    # Pagination: conditionally enable when requested to preserve backward compatibility
    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size")
    paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

    if page or page_size or paginate:
        paginator = PageNumberPagination()
        if page_size and page_size.isdigit():
            paginator.page_size = int(page_size)
        else:
            paginator.page_size = 8

        result_page = paginator.paginate_queryset(brands, request)
        serializer = BrandSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = BrandSerializer(brands, many=True)
    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def product_detail(request, product_id):

    # Find the product using the ID
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Product information
    product_serializer = ProductSerializer(product)

    # Product variants
    variant_serializer = ProductVariantSerializer(
        product.variants.all(),
        many=True
    )

    # Product images
    image_serializer = ProductImageSerializer(
        product.images.all(),
        many=True
    )

    # Product specifications
    specification_serializer = ProductSpecificationSerializer(
        product.specifications.all(),
        many=True
    )

    # Send complete product details
    return Response(
        {
            "product": product_serializer.data,
            "variants": variant_serializer.data,
            "images": image_serializer.data,
            "specifications": specification_serializer.data
        },
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_product(request):
    # Get the product data sent from Postman/frontend
    serializer = ProductSerializer(data=request.data)

    # Check whether all product data is valid
    if serializer.is_valid():

        # Save the valid product data into the database
        serializer.save()

        # Send success response
        return Response(
            {
                "message": "Product created successfully.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    # Send validation errors if the data is invalid
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_product(request, product_id):
    # Find the product using the ID from the URL
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Send the existing product and new data to the serializer
    serializer = ProductSerializer(
        product,
        data=request.data
    )

    # Check whether the new data is valid
    if serializer.is_valid():

        # Update the product in the database
        serializer.save()

        # Send the updated product
        return Response(
            {
                "message": "Product updated successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_product(request, product_id):
    # Find the product using the ID from the URL
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        with transaction.atomic():
            # Dissociate any order items referencing product variants so the historical order records remain intact
            from orders.models import OrderItem
            OrderItem.objects.filter(product_variant__product=product).update(product_variant=None)

            # Collect image URLs before cascading delete
            cloudinary_urls_to_delete = []
            local_paths_to_delete = []
            for img in product.images.all():
                if img.image and is_cloudinary_url(img.image):
                    cloudinary_urls_to_delete.append(img.image)
                elif img.image and img.image.startswith("/media/products/"):
                    try:
                        rel_path = img.image[len("/media/"):]
                        full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                        local_paths_to_delete.append(full_path)
                    except Exception:
                        pass

            # Delete the product and its cascaded variants, images, and specifications
            product.delete()

            # Schedule external image cleanup only after successful database commit
            def _cleanup_product_assets():
                for c_url in cloudinary_urls_to_delete:
                    try:
                        delete_image_from_cloudinary(c_url)
                    except Exception:
                        pass
                for l_path in local_paths_to_delete:
                    try:
                        if os.path.isfile(l_path):
                            os.remove(l_path)
                    except Exception:
                        pass

            transaction.on_commit(_cleanup_product_assets)

        # Send success response
        return Response(
            {"message": "Product deleted successfully."},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to delete product: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_category(request):
    # Get category data sent from Postman/frontend
    serializer = CategorySerializer(data=request.data)

    # Check whether the category data is valid
    if serializer.is_valid():

        # Save the category into the database
        serializer.save()

        # Send success response
        return Response(
            {
                "message": "Category created successfully.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_category(request, category_id):
    # Find the category using the ID from the URL
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {"error": "Category not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Send the existing category and new data to the serializer
    serializer = CategorySerializer(
        category,
        data=request.data
    )

    # Check whether the new data is valid
    if serializer.is_valid():

        # Update the category in the database
        serializer.save()

        # Send the updated category
        return Response(
            {
                "message": "Category updated successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_category(request, category_id):
    # Find the category using the ID from the URL
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {"error": "Category not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if category has any products attached
    if category.products.exists():
        return Response(
            {"error": "Cannot delete category because it contains products. Reassign or remove the products first."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Delete the category from the database
        category.delete()
    except ProtectedError:
        return Response(
            {"error": "Cannot delete category because it contains products. Reassign or remove the products first."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Send success response
    return Response(
        {"message": "Category deleted successfully."},
        status=status.HTTP_200_OK
    )

def _handle_logo_upload(request):
    file_obj = request.FILES.get("logo")
    if not file_obj:
        return None
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif", ".ico", ".bmp"}
    res = upload_image_to_cloudinary(
        file_obj,
        folder_type="brands",
        allowed_extensions=allowed_extensions,
    )
    return res["secure_url"]

@api_view(["POST"])
@permission_classes([IsAdmin])
def upload_brand_logo(request):
    file_obj = request.FILES.get("logo")
    if not file_obj:
        return Response(
            {"error": "No logo file provided."},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        uploaded_logo = _handle_logo_upload(request)
    except ValidationError as e:
        err_msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
        return Response({"error": str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if not uploaded_logo:
        return Response(
            {"error": "Invalid file type. Allowed formats: PNG, JPG, JPEG, WEBP, SVG, GIF, AVIF, BMP, ICO."},
            status=status.HTTP_400_BAD_REQUEST
        )
    return Response(
        {"logo": uploaded_logo, "message": "Logo uploaded successfully to Cloudinary."},
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([IsAdmin])
def create_brand(request):
    data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
    file_obj = request.FILES.get("logo")
    uploaded_logo = None
    if file_obj:
        try:
            uploaded_logo = _handle_logo_upload(request)
            data["logo"] = uploaded_logo
        except ValidationError as e:
            err_msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
            return Response({"error": str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    elif "logo" in data and not isinstance(data["logo"], str):
        del data["logo"]

    serializer = BrandSerializer(data=data, context={"request": request})
    if serializer.is_valid():
        try:
            with transaction.atomic():
                serializer.save()
            return Response(
                {
                    "message": "Brand created successfully.",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            if uploaded_logo and is_cloudinary_url(uploaded_logo):
                delete_image_from_cloudinary(uploaded_logo)
            return Response({"error": f"Failed to save brand: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    # Clean up uploaded Cloudinary image if DB save fails
    if uploaded_logo and is_cloudinary_url(uploaded_logo):
        delete_image_from_cloudinary(uploaded_logo)

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["PUT", "PATCH"])
@permission_classes([IsAdmin])
def update_brand(request, brand_id):
    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response(
            {"error": "Brand not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
    file_obj = request.FILES.get("logo")
    uploaded_logo = None
    old_logo = brand.logo

    if file_obj:
        try:
            uploaded_logo = _handle_logo_upload(request)
            data["logo"] = uploaded_logo
        except ValidationError as e:
            err_msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
            return Response({"error": str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    elif "logo" in data and not isinstance(data["logo"], str):
        del data["logo"]

    partial = request.method == "PATCH"
    serializer = BrandSerializer(brand, data=data, partial=partial, context={"request": request})
    if serializer.is_valid():
        try:
            with transaction.atomic():
                serializer.save()

                # Clean up old logo only after commit
                if uploaded_logo and old_logo and old_logo != uploaded_logo:
                    def _cleanup_old_brand_logo():
                        if is_cloudinary_url(old_logo):
                            delete_image_from_cloudinary(old_logo)
                        elif old_logo.startswith("/media/brands/"):
                            try:
                                rel_path = old_logo[len("/media/"):]
                                full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                                if os.path.isfile(full_path):
                                    os.remove(full_path)
                            except Exception:
                                pass
                    transaction.on_commit(_cleanup_old_brand_logo)

            return Response(
                {
                    "message": "Brand updated successfully.",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            if uploaded_logo and is_cloudinary_url(uploaded_logo):
                delete_image_from_cloudinary(uploaded_logo)
            return Response({"error": f"Failed to update brand: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    # Clean up uploaded Cloudinary image if DB update fails
    if uploaded_logo and is_cloudinary_url(uploaded_logo):
        delete_image_from_cloudinary(uploaded_logo)

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_brand(request, brand_id):
    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response(
            {"error": "Brand not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if brand has any products attached
    if brand.products.exists():
        return Response(
            {"error": "Cannot delete this brand because products are currently associated with it."},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_logo = brand.logo
    try:
        with transaction.atomic():
            brand.delete()
            if old_logo:
                def _cleanup_deleted_brand_logo():
                    if is_cloudinary_url(old_logo):
                        delete_image_from_cloudinary(old_logo)
                    elif old_logo.startswith("/media/brands/"):
                        try:
                            rel_path = old_logo[len("/media/"):]
                            full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                            if os.path.isfile(full_path):
                                os.remove(full_path)
                        except Exception:
                            pass
                transaction.on_commit(_cleanup_deleted_brand_logo)
    except ProtectedError:
        return Response(
            {"error": "Cannot delete this brand because products are currently associated with it."},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response({"error": f"Failed to delete brand: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {"message": "Brand deleted successfully."},
        status=status.HTTP_200_OK
    )

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAdmin])
def brand_admin_detail(request, brand_id):
    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response(
            {"error": "Brand not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "DELETE":
        if brand.products.exists():
            return Response(
                {"error": "Cannot delete this brand because products are currently associated with it."},
                status=status.HTTP_400_BAD_REQUEST
            )
        old_logo = brand.logo
        try:
            with transaction.atomic():
                brand.delete()
                if old_logo:
                    def _cleanup_admin_brand_logo():
                        if is_cloudinary_url(old_logo):
                            delete_image_from_cloudinary(old_logo)
                        elif old_logo.startswith("/media/brands/"):
                            try:
                                rel_path = old_logo[len("/media/"):]
                                full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                                if os.path.isfile(full_path):
                                    os.remove(full_path)
                            except Exception:
                                pass
                    transaction.on_commit(_cleanup_admin_brand_logo)
        except ProtectedError:
            return Response(
                {"error": "Cannot delete this brand because products are currently associated with it."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({"error": f"Failed to delete brand: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Brand deleted successfully."}, status=status.HTTP_200_OK)

    elif request.method in ["PUT", "PATCH"]:
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        file_obj = request.FILES.get("logo")
        uploaded_logo = None
        old_logo = brand.logo

        if file_obj:
            try:
                uploaded_logo = _handle_logo_upload(request)
                data["logo"] = uploaded_logo
            except ValidationError as e:
                err_msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
                return Response({"error": str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        elif "logo" in data and not isinstance(data["logo"], str):
            del data["logo"]

        partial = request.method == "PATCH"
        serializer = BrandSerializer(brand, data=data, partial=partial, context={"request": request})
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    serializer.save()
                    if uploaded_logo and old_logo and old_logo != uploaded_logo:
                        def _cleanup_old_detail_logo():
                            if is_cloudinary_url(old_logo):
                                delete_image_from_cloudinary(old_logo)
                            elif old_logo.startswith("/media/brands/"):
                                try:
                                    rel_path = old_logo[len("/media/"):]
                                    full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                                    if os.path.isfile(full_path):
                                        os.remove(full_path)
                                except Exception:
                                    pass
                        transaction.on_commit(_cleanup_old_detail_logo)
                return Response(
                    {
                        "message": "Brand updated successfully.",
                        "data": serializer.data
                    },
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                if uploaded_logo and is_cloudinary_url(uploaded_logo):
                    delete_image_from_cloudinary(uploaded_logo)
                return Response({"error": f"Failed to update brand: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_logo and is_cloudinary_url(uploaded_logo):
            delete_image_from_cloudinary(uploaded_logo)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # GET
    serializer = BrandSerializer(brand, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([IsAdmin])
def create_product_variant(request):
    # Get variant data sent from Postman/frontend
    serializer = ProductVariantSerializer(data=request.data)

    # Check whether the variant data is valid
    if serializer.is_valid():

        # Save the variant into the database
        serializer.save()

        # Send success response
        return Response(
            {
                "message": "Product variant created successfully.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_product_variant(request, variant_id):
    # Find the variant using the ID from the URL
    try:
        variant = ProductVariant.objects.get(id=variant_id)
    except ProductVariant.DoesNotExist:
        return Response(
            {"error": "Product variant not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Send the existing variant and new data to the serializer
    serializer = ProductVariantSerializer(
        variant,
        data=request.data
    )

    # Check whether the new data is valid
    if serializer.is_valid():

        # Update the variant in the database
        serializer.save()

        # Send the updated variant
        return Response(
            {
                "message": "Product variant updated successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_product_variant(request, variant_id):
    # Find the variant using the ID from the URL
    try:
        variant = ProductVariant.objects.get(id=variant_id)
    except ProductVariant.DoesNotExist:
        return Response(
            {"error": "Product variant not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the variant from the database
    variant.delete()

    # Send success response
    return Response(
        {"message": "Product variant deleted successfully."},
        status=status.HTTP_200_OK
    )

def _handle_product_image_upload(file_obj):
    if not file_obj:
        return None
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"}
    res = upload_image_to_cloudinary(
        file_obj,
        folder_type="products",
        allowed_extensions=allowed_extensions,
    )
    return res["secure_url"]

@api_view(["POST"])
@permission_classes([IsAdmin])
def upload_product_image_file(request):
    file_obj = request.FILES.get("image") or request.FILES.get("file")
    if not file_obj:
        return Response(
            {"error": "No image file provided."},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        uploaded_path = _handle_product_image_upload(file_obj)
    except ValidationError as e:
        err_msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
        return Response({"error": str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if not uploaded_path:
        return Response(
            {"error": "Invalid image file format. Allowed: .png, .jpg, .jpeg, .webp, .svg, .gif, .avif"},
            status=status.HTTP_400_BAD_REQUEST
        )
    return Response(
        {
            "image": uploaded_path,
            "url": uploaded_path,
            "filename": file_obj.name,
            "message": "Image uploaded successfully to Cloudinary."
        },
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([IsAdmin])
def create_product_image(request):
    data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)

    # Check if a file was uploaded directly
    file_obj = request.FILES.get("image") or request.FILES.get("file")
    uploaded_url = None
    if file_obj:
        try:
            uploaded_url = _handle_product_image_upload(file_obj)
            data["image"] = uploaded_url
        except ValidationError as e:
            err_msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
            return Response({"error": str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Get image data sent from Postman/frontend
    serializer = ProductImageSerializer(data=data, context={"request": request})

    # Check whether the image data is valid
    if serializer.is_valid():
        try:
            with transaction.atomic():
                serializer.save()
            return Response(
                {
                    "message": "Product image added successfully.",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            if uploaded_url and is_cloudinary_url(uploaded_url):
                delete_image_from_cloudinary(uploaded_url)
            return Response({"error": f"Database save failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    # Clean up uploaded Cloudinary image if DB validation failed
    if uploaded_url and is_cloudinary_url(uploaded_url):
        delete_image_from_cloudinary(uploaded_url)

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_product_image(request, image_id):
    # Find the image using the ID from the URL
    try:
        image = ProductImage.objects.get(id=image_id)
    except ProductImage.DoesNotExist:
        return Response(
            {"error": "Product image not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    img_url = image.image
    try:
        with transaction.atomic():
            image.delete()

            def _cleanup_deleted_product_image():
                if img_url and is_cloudinary_url(img_url):
                    delete_image_from_cloudinary(img_url)
                elif img_url and img_url.startswith("/media/products/"):
                    try:
                        rel_path = img_url[len("/media/"):]
                        full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                        if os.path.isfile(full_path):
                            os.remove(full_path)
                    except Exception:
                        pass

            transaction.on_commit(_cleanup_deleted_product_image)

        return Response(
            {"message": "Product image deleted successfully."},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response({"error": f"Failed to delete product image: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
@api_view(["POST"])
@permission_classes([IsAdmin])
def create_product_specification(request):
    # Get specification data from the request
    serializer = ProductSpecificationSerializer(data=request.data)

    # Check whether the data is valid
    if serializer.is_valid():

        # Save the specification
        serializer.save()

        return Response(
            {
                "message": "Product specification added successfully.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    # Return validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_product_specification(request, specification_id):
    # Find the specification using the ID from the URL
    try:
        specification = ProductSpecification.objects.get(id=specification_id)
    except ProductSpecification.DoesNotExist:
        return Response(
            {"error": "Product specification not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the specification
    specification.delete()

    return Response(
        {"message": "Product specification deleted successfully."},
        status=status.HTTP_200_OK
    )

@api_view(["PUT", "PATCH"])
@permission_classes([IsAdmin])
def update_product_specification(request, specification_id):
    try:
        specification = ProductSpecification.objects.get(id=specification_id)
    except ProductSpecification.DoesNotExist:
        return Response(
            {"error": "Product specification not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ProductSpecificationSerializer(
        specification, data=request.data, partial=True
    )
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "Product specification updated successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

# Admin: Get products that are low in stock
@api_view(["GET"])
@permission_classes([IsAdmin])
def low_stock_products(request):

    # Find products where stock is less than
    # or equal to the low stock threshold
    products = Product.objects.filter(
        stock__lte=F("low_stock_threshold") 
    ).order_by("stock")

    serializer = ProductSerializer(products, many=True)

    return Response(
        {"products": serializer.data},
        status=status.HTTP_200_OK
    )