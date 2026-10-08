from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Brand(models.Model):
    name = models.CharField(max_length=150, unique=True)
    logo = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, default="listed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True)
    brand = models.ForeignKey(Brand,on_delete=models.PROTECT,related_name="products")
    category = models.ForeignKey(Category,on_delete=models.PROTECT,related_name="products")
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=12,decimal_places=2)
    low_stock_threshold = models.IntegerField(default=0)
    stock = models.IntegerField(default=0)
    status = models.CharField(max_length=30,default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.product_name

class ProductVariant(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name="variants")
    variant_name = models.CharField(max_length=150,blank=True)
    price = models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
    stock = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.product_name} - {self.variant_name}"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.CharField(max_length=255, default="", blank=True)
    image_type = models.CharField(max_length=30, default="", blank=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return f"{self.product.product_name} - Image"

class ProductSpecification(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name="specifications")
    specification_name = models.CharField(max_length=150)
    specification_value = models.CharField(max_length=500)

    def __str__(self):
        return f"{self.specification_name}: {self.specification_value}"
