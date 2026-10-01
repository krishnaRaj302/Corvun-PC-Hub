from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Category, Brand
from .serializers import (
    ProductSerializer,
    CategorySerializer,
    BrandSerializer,
)


@api_view(["GET"])
def product_list(request):

    products = Product.objects.all()

    serializer = ProductSerializer(products, many=True)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


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
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ProductSerializer(product)

    return Response(
        serializer.data,
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