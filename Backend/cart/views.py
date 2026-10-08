from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import CartItemSerializer,WishlistItemSerializer

from products.models import Product,ProductVariant
from .models import (
    Cart,
    CartItem,
    Wishlist,
    WishlistItem,

)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get("product_id")
    variant_id = request.data.get("variant_id")
    quantity = request.data.get("quantity", 1)

    # Check product ID
    if not product_id:
        return Response(
            {"error": "Product ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check quantity
    if quantity < 1:
        return Response(
            {"error": "Quantity must be at least 1."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get product
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get variant if provided
    variant = None

    if variant_id:
        try:
            variant = ProductVariant.objects.get(
                id=variant_id,
                product=product
            )
        except ProductVariant.DoesNotExist:
            return Response(
                {"error": "Product variant not found."},
                status=status.HTTP_404_NOT_FOUND
            )
    # Check stock
    available_stock = variant.stock if variant else product.stock

    if quantity > available_stock:
        return Response(
            {"error": "Not enough stock available."},
            status=status.HTTP_400_BAD_REQUEST
        )
    # Get or create cart for the logged-in user
    cart, created = Cart.objects.get_or_create(
        user=request.user
    )
    # Check whether this product/variant is already in cart
    cart_item = CartItem.objects.filter(
        cart=cart,
        product=product,
        variant=variant
    ).first()
    if cart_item:
        new_quantity = cart_item.quantity + quantity

        if new_quantity > available_stock:
            return Response(
                {"error": "Not enough stock available."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_item.quantity = new_quantity
        cart_item.save()

    else:
        cart_item = CartItem.objects.create(
            cart=cart,
            product=product,
            variant=variant,
            quantity=quantity
        )
    return Response(
        {
            "message": "Product added to cart successfully.",
            "cart_item_id": cart_item.id,
            "quantity": cart_item.quantity
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_cart(request):
    # Get the logged-in user's cart
    try:
        cart = Cart.objects.get(user=request.user)
    except Cart.DoesNotExist:
        return Response(
            {"message": "Your cart is empty."},
            status=status.HTTP_200_OK
        )

    # Get all items in the cart
    cart_items = CartItem.objects.filter(cart=cart)

    serializer = CartItemSerializer(
        cart_items,
        many=True
    )

    return Response(
        {
            "cart_id": cart.id,
            "items": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_cart_quantity(request, item_id):

    quantity = request.data.get("quantity")

    # Check quantity
    if not quantity:
        return Response(
            {"error": "Quantity is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if quantity < 1:
        return Response(
            {"error": "Quantity must be at least 1."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the logged-in user's cart
    try:
        cart = Cart.objects.get(user=request.user)
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get the cart item
    try:
        cart_item = CartItem.objects.get(
            id=item_id,
            cart=cart
        )
    except CartItem.DoesNotExist:
        return Response(
            {"error": "Cart item not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check available stock
    if cart_item.variant:
        available_stock = cart_item.variant.stock
    else:
        available_stock = cart_item.product.stock

    if quantity > available_stock:
        return Response(
            {"error": "Not enough stock available."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update quantity
    cart_item.quantity = quantity
    cart_item.save()

    return Response(
        {
            "message": "Cart quantity updated successfully.",
            "cart_item_id": cart_item.id,
            "quantity": cart_item.quantity
        },
        status=status.HTTP_200_OK
    )

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_cart_item(request, item_id):

    # Get the logged-in user's cart
    try:
        cart = Cart.objects.get(user=request.user)
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get the cart item
    try:
        cart_item = CartItem.objects.get(
            id=item_id,
            cart=cart
        )
    except CartItem.DoesNotExist:
        return Response(
            {"error": "Cart item not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the item
    cart_item.delete()

    return Response(
        {
            "message": "Cart item removed successfully."
        },
        status=status.HTTP_200_OK
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_to_wishlist(request):

    product_id = request.data.get("product_id")

    if not product_id:
        return Response(
            {"error": "Product ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    wishlist, created = Wishlist.objects.get_or_create(
        user=request.user
    )

    wishlist_item, created = WishlistItem.objects.get_or_create(
        wishlist=wishlist,
        product=product
    )

    if not created:
        return Response(
            {"message": "Product is already in wishlist."},
            status=status.HTTP_200_OK
        )

    return Response(
        {
            "message": "Product added to wishlist successfully.",
            "wishlist_item_id": wishlist_item.id
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_wishlist(request):

    # Get the wishlist of the logged-in user
    try:
        wishlist = Wishlist.objects.get(user=request.user)
    except Wishlist.DoesNotExist:
        # If the user has no wishlist, return an empty response
        return Response(
            {
                "message": "Your wishlist is empty.",
                "items": []
            },
            status=status.HTTP_200_OK
        )

    # Get all items from this wishlist
    wishlist_items = WishlistItem.objects.filter(
        wishlist=wishlist
    )

    # Convert wishlist items into JSON
    serializer = WishlistItemSerializer(
        wishlist_items,
        many=True
    )

    # Send wishlist data as the response
    return Response(
        {
            "wishlist_id": wishlist.id,
            "items": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_from_wishlist(request, item_id):

    # Get the wishlist of the logged-in user
    try:
        wishlist = Wishlist.objects.get(user=request.user)
    except Wishlist.DoesNotExist:
        return Response(
            {"error": "Wishlist not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get the wishlist item belonging to this user's wishlist
    try:
        wishlist_item = WishlistItem.objects.get(
            id=item_id,
            wishlist=wishlist
        )
    except WishlistItem.DoesNotExist:
        return Response(
            {"error": "Wishlist item not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the wishlist item
    wishlist_item.delete()

    # Return success response
    return Response(
        {"message": "Product removed from wishlist successfully."},
        status=status.HTTP_200_OK
    )