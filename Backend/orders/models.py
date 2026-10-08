from django.db import models
from accounts.models import User
from products.models import ProductVariant


class Order(models.Model):
    user = models.ForeignKey(User,on_delete=models.PROTECT,related_name="orders")
    order_number = models.CharField(max_length=100,unique=True)
    shipping_address_id = models.BigIntegerField()
    subtotal = models.DecimalField(max_digits=12,decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12,decimal_places=2,default=0)
    shipping_amount = models.DecimalField(max_digits=12,decimal_places=2,default=0)
    tax_amount = models.DecimalField(max_digits=12,decimal_places=2,default=0)
    total_amount = models.DecimalField(max_digits=12,decimal_places=2)
    status = models.CharField(max_length=30,default="pending")
    payment_status = models.CharField(max_length=30,default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order,on_delete=models.CASCADE,related_name="items")
    product_variant = models.ForeignKey(ProductVariant,on_delete=models.PROTECT,related_name="order_items",null=True,blank=True)
    product_name = models.CharField(max_length=255)
    variant_name = models.CharField(max_length=150)
    sku = models.CharField(max_length=100)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12,decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12,decimal_places=2,default=0)
    tax_amount = models.DecimalField(max_digits=12,decimal_places=2,default=0)
    total_amount = models.DecimalField(max_digits=12,decimal_places=2)
    item_status = models.CharField(max_length=30,default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.order.order_number} - {self.product_name}"
