from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order",
            "product_variant",
            "product_name",
            "variant_name",
            "sku",
            "quantity",
            "unit_price",
            "discount_amount",
            "tax_amount",
            "total_amount",
            "item_status",
            "created_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    # Show all items belonging to this order
    items = OrderItemSerializer(many=True, read_only=True)
    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "order_number",
            "shipping_address_id",
            "subtotal",
            "discount_amount",
            "shipping_amount",
            "tax_amount",
            "total_amount",
            "status",
            "payment_status",
            "items",
            "created_at",
            "updated_at",
        ]