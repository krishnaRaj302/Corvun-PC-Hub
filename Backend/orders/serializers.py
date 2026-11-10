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

    customer_name = serializers.CharField(source="user.full_name", read_only=True, default="")
    customer_email = serializers.CharField(source="user.email", read_only=True, default="")
    customer_phone = serializers.CharField(source="user.phone", read_only=True, default="")
    items_count = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "customer_name",
            "customer_email",
            "customer_phone",
            "order_number",
            "shipping_address_id",
            "shipping_address",
            "subtotal",
            "discount_amount",
            "shipping_amount",
            "tax_amount",
            "total_amount",
            "status",
            "payment_status",
            "items_count",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_items_count(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_shipping_address(self, obj):
        if not obj.shipping_address_id:
            return None
        from accounts.models import Address
        try:
            addr = Address.objects.get(id=obj.shipping_address_id)
            return {
                "id": addr.id,
                "full_name": addr.full_name,
                "phone": addr.phone,
                "alternative_phone": addr.alternative_phone,
                "address_line1": addr.address_line1,
                "address_line2": addr.address_line2,
                "city": addr.city,
                "state": addr.state,
                "postal_code": addr.postal_code,
                "country": addr.country,
            }
        except Address.DoesNotExist:
            return None