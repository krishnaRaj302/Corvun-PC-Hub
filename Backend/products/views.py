from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.db.models import F

from accounts.permissions import IsAdmin
from rest_framework.permissions import IsAuthenticated

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

    products = Product.objects.all()

    paginator = PageNumberPagination()
    paginator.page_size = 10

    result_page = paginator.paginate_queryset(products, request)

    serializer = ProductSerializer(result_page, many=True)

    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
def category_list(request):

    categories = Category.objects.all()

    serializer = CategorySerializer(categories, many=True)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def brand_list(request):

    brands = Brand.objects.all()

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
def delete_product(request, product_id):
    # Find the product using the ID from the URL
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the product from the database
    product.delete()

    # Send success response
    return Response(
        {"message": "Product deleted successfully."},
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
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
def delete_category(request, category_id):
    # Find the category using the ID from the URL
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {"error": "Category not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the category from the database
    category.delete()

    # Send success response
    return Response(
        {"message": "Category deleted successfully."},
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
def create_brand(request):
    # Get brand data sent from Postman/frontend
    serializer = BrandSerializer(data=request.data)

    # Check whether the brand data is valid
    if serializer.is_valid():

        # Save the brand into the database
        serializer.save()

        # Send success response
        return Response(
            {
                "message": "Brand created successfully.",
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
def update_brand(request, brand_id):
    # Find the brand using the ID from the URL
    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response(
            {"error": "Brand not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Send the existing brand and new data to the serializer
    serializer = BrandSerializer(
        brand,
        data=request.data
    )

    # Check whether the new data is valid
    if serializer.is_valid():

        # Update the brand in the database
        serializer.save()

        # Send the updated brand
        return Response(
            {
                "message": "Brand updated successfully.",
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
def delete_brand(request, brand_id):
    # Find the brand using the ID from the URL
    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response(
            {"error": "Brand not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the brand from the database
    brand.delete()

    # Send success response
    return Response(
        {"message": "Brand deleted successfully."},
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
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

@api_view(["POST"])
def create_product_image(request):
    # Get image data sent from Postman/frontend
    serializer = ProductImageSerializer(data=request.data)

    # Check whether the image data is valid
    if serializer.is_valid():

        # Save the image into the database
        serializer.save()

        # Send success response
        return Response(
            {
                "message": "Product image added successfully.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    # Send validation errors
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["DELETE"])
def delete_product_image(request, image_id):
    # Find the image using the ID from the URL
    try:
        image = ProductImage.objects.get(id=image_id)
    except ProductImage.DoesNotExist:
        return Response(
            {"error": "Product image not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the image
    image.delete()

    return Response(
        {"message": "Product image deleted successfully."},
        status=status.HTTP_200_OK
    )
@api_view(["POST"])
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