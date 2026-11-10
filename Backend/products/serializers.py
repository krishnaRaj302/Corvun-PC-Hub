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
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "status",
            "product_count",
            "created_at",
            "updated_at",
        ]

    def get_product_count(self, obj):
        if hasattr(obj, "product_count"):
            return obj.product_count
        return obj.products.count()


# =========================
# Brand Serializer
# =========================

class BrandSerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        validators=[validate_brand_name]
    )
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = [
            "id",
            "name",
            "logo",
            "status",
            "product_count",
            "created_at",
            "updated_at",
        ]

    def get_product_count(self, obj):
        if hasattr(obj, "product_count"):
            return obj.product_count
        return obj.products.count()


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

    brand_name = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"

    def _format_image_url(self, img_url):
        if not img_url:
            return ""
        if img_url.startswith("http://") or img_url.startswith("https://"):
            return img_url
        request = self.context.get("request")
        if request and img_url.startswith("/"):
            return request.build_absolute_uri(img_url)
        if img_url.startswith("/"):
            return f"http://127.0.0.1:8002{img_url}"
        return img_url

    def get_primary_image(self, obj):
        first_img = obj.images.order_by("sort_order", "id").first()
        return self._format_image_url(first_img.image) if first_img else ""

    def get_images(self, obj):
        return [
            {
                "id": img.id,
                "image": self._format_image_url(img.image),
                "image_type": img.image_type,
                "sort_order": img.sort_order,
            }
            for img in obj.images.order_by("sort_order", "id")
        ]



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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        img_url = data.get("image")
        if img_url and img_url.startswith("/media/"):
            request = self.context.get("request")
            if request:
                data["image"] = request.build_absolute_uri(img_url)
            else:
                data["image"] = f"http://127.0.0.1:8002{img_url}"
        return data


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