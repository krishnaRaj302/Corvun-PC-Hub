from rest_framework import serializers

from .models import Order, OrderItem

from .validators import (
    validate_amount,
    validate_total_amount,
    validate_item_quantity,
    validate_unit_price,
    validate_item_discount,
    validate_item_tax,
    validate_item_total,
)


# =========================
# Order Item Serializer
# =========================

class OrderItemSerializer(serializers.ModelSerializer):

    quantity = serializers.IntegerField(
        validators=[validate_item_quantity]
    )

    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_unit_price]
    )

    discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_item_discount]
    )

    tax_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_item_tax]
    )

    total_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_item_total]
    )

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


# =========================
# Order Serializer
# =========================

class OrderSerializer(serializers.ModelSerializer):

    # Show all items belonging to this order
    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_amount]
    )

    discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_amount]
    )

    shipping_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_amount]
    )

    tax_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_amount]
    )

    total_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_total_amount]
    )

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