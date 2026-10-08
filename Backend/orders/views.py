from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer
from cart.models import Cart
from accounts.models import Address
from accounts.permissions import IsAdmin


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_order(request):

    # Get the logged-in user's cart
    try:
        cart = Cart.objects.get(user=request.user)
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get all items from the cart
    cart_items = cart.items.all()

    # Check whether the cart is empty
    if not cart_items.exists():
        return Response(
            {"error": "Your cart is empty."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check stock before creating the order
    for item in cart_items:

        # Use variant stock when the cart item has a variant
        if item.variant:
            available_stock = item.variant.stock
        else:
            # Otherwise use the main product stock
            available_stock = item.product.stock

        # Check whether enough stock is available
        if item.quantity > available_stock:
            return Response(
                {
                    "error": f"Not enough stock for {item.product.product_name}."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    # Calculate subtotal
    subtotal = 0

    for item in cart_items:

        # Get the product price
        if item.variant and item.variant.price is not None:
            price = item.variant.price
        else:
            price = item.product.base_price

        # Add item total to subtotal
        subtotal += price * item.quantity

    # Create a simple order number
    order_number = f"ORD-{request.user.id}-{Order.objects.count() + 1}"

    # Get the shipping address selected by the user
    shipping_address_id = request.data.get("shipping_address_id")

    # Check whether an address was provided
    if not shipping_address_id:
        return Response(
            {"error": "Shipping address is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check that the address belongs to the logged-in user
    try:
        shipping_address = Address.objects.get(
            id=shipping_address_id,
            user=request.user
        )
    except Address.DoesNotExist:
        return Response(
            {"error": "Invalid shipping address."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the order
    order = Order.objects.create(
        user=request.user,
        order_number=order_number,
        shipping_address_id=shipping_address.id,
        subtotal=subtotal,
        discount_amount=0,
        shipping_amount=0,
        tax_amount=0,
        total_amount=subtotal,
        status="pending",
        payment_status="pending"
    )

    # Create order items
    for item in cart_items:

        # Get the product price
        if item.variant and item.variant.price is not None:
            price = item.variant.price
            variant_name = item.variant.variant_name
            product_variant = item.variant
        else:
            price = item.product.base_price
            variant_name = ""
            product_variant = None

        # Create the order item
        OrderItem.objects.create(
            order=order,
            product_variant=product_variant,
            product_name=item.product.product_name,
            variant_name=variant_name,
            sku=item.product.sku,
            quantity=item.quantity,
            unit_price=price,
            discount_amount=0,
            tax_amount=0,
            total_amount=price * item.quantity,
            item_status="pending"
        )

    for item in cart_items:
        if item.variant:
            item.variant.stock -= item.quantity
            item.variant.save()
        else:
        # Otherwise reduce the main product stock
            item.product.stock -= item.quantity
            item.product.save()

    # Clear the cart after creating the order
    cart_items.delete()

    # Convert the order into JSON format
    serializer = OrderSerializer(order)

    # Return the created order
    return Response(
        {
            "message": "Order created successfully.",
            "order": serializer.data
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):

    # Get orders belonging to the logged-in user
    orders = Order.objects.filter(
        user=request.user
    ).order_by("-created_at")

    # Convert orders into JSON format
    serializer = OrderSerializer(orders, many=True)

    # Return customer's orders
    return Response(
        {
            "orders": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    # Get the order only if it belongs to the logged-in user
    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Convert the order into JSON
    serializer = OrderSerializer(order)

    # Return the order details
    return Response(
        {"order": serializer.data},
        status=status.HTTP_200_OK
    )

@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_order_status(request, order_id):

    # Get the order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get the new status from the request
    new_status = request.data.get("status")

    # Check whether status was provided
    if not new_status:
        return Response(
            {"error": "Status is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Allowed order statuses
    allowed_statuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
    ]

    # Check whether the status is valid
    if new_status not in allowed_statuses:
        return Response(
            {"error": "Invalid order status."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update the order status
    order.status = new_status
    order.save()

    # Return the updated order
    serializer = OrderSerializer(order)

    return Response(
        {
            "message": "Order status updated successfully.",
            "order": serializer.data
        },
        status=status.HTTP_200_OK
    )
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    # Find the order belonging to the logged-in user
    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only pending orders can be cancelled
    if order.status != "pending":
        return Response(
            {"error": "Only pending orders can be cancelled."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Change the order status
    order.status = "cancelled"
    order.save()

    # Return the updated order
    serializer = OrderSerializer(order)

    return Response(
        {
            "message": "Order cancelled successfully.",
            "order": serializer.data
        },
        status=status.HTTP_200_OK
    )
@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_orders(request):

    # Get all orders from the database
    orders = Order.objects.all().order_by("-created_at")

    # Convert orders into JSON format
    serializer = OrderSerializer(orders, many=True)

    # Return all orders
    return Response(
        {
            "orders": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_order_detail(request, order_id):

    # Get the selected order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Convert the order into JSON format
    serializer = OrderSerializer(order)

    # Return the order details
    return Response(
        {
            "order": serializer.data
        },
        status=status.HTTP_200_OK
    )
