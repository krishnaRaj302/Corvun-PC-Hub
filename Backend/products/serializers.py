from rest_framework import serializers

from .models import (
    Category,
    Brand,
    Product,
    ProductVariant,
    ProductImage,
    ProductSpecification,
)

from .validators import (
    validate_product_name,
    validate_price,
    validate_stock,
    validate_low_stock_threshold,
    validate_category_name,
    validate_brand_name,
    validate_variant_name,
    validate_variant_price,
    validate_variant_stock,
    validate_image,
    validate_image_type,
    validate_sort_order,
    validate_specification_name,
    validate_specification_value,
)


# =========================
# Category Serializer
# =========================

class CategorySerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        validators=[validate_category_name]
    )

    class Meta:
        model = Category
        fields = "__all__"


# =========================
# Brand Serializer
# =========================

class BrandSerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        validators=[validate_brand_name]
    )

    class Meta:
        model = Brand
        fields = "__all__"


# =========================
# Product Serializer
# =========================

class ProductSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        validators=[validate_product_name]
    )

    base_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_price]
    )

    stock = serializers.IntegerField(
        validators=[validate_stock]
    )

    low_stock_threshold = serializers.IntegerField(
        validators=[validate_low_stock_threshold]
    )

    class Meta:
        model = Product
        fields = "__all__"


# =========================
# Product Variant Serializer
# =========================

class ProductVariantSerializer(serializers.ModelSerializer):

    variant_name = serializers.CharField(
        validators=[validate_variant_name],
        required=False,
        allow_blank=True
    )

    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_variant_price],
        required=False,
        allow_null=True
    )

    stock = serializers.IntegerField(
        validators=[validate_variant_stock]
    )

    class Meta:
        model = ProductVariant
        fields = "__all__"


# =========================
# Product Image Serializer
# =========================

class ProductImageSerializer(serializers.ModelSerializer):

    image = serializers.CharField(
        validators=[validate_image]
    )

    image_type = serializers.CharField(
        validators=[validate_image_type],
        required=False,
        allow_blank=True
    )

    sort_order = serializers.IntegerField(
        validators=[validate_sort_order]
    )

    class Meta:
        model = ProductImage
        fields = "__all__"


# =========================
# Product Specification Serializer
# =========================

class ProductSpecificationSerializer(serializers.ModelSerializer):

    specification_name = serializers.CharField(
        validators=[validate_specification_name]
    )

    specification_value = serializers.CharField(
        validators=[validate_specification_value]
    )

    class Meta:
        model = ProductSpecification
        fields = "__all__"