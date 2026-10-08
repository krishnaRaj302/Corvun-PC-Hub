from rest_framework import serializers
from .models import CartItem,WishlistItem


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = [
            "id",
            "cart",
            "product",
            "variant",
            "quantity",
            "created_at",
            "updated_at",
        ]

class WishlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "wishlist",
            "product",
            "created_at",
        ]