from django.db import models
from products.models import Product,Category

class Coupon(models.Model):
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=30)
    discount_value = models.DecimalField(max_digits=12, decimal_places=2)
    expiry_date = models.DateTimeField()
    status = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code

class Offer(models.Model):
    title = models.CharField(max_length=255)
    discount_value = models.DecimalField(max_digits=12,decimal_places=2)
    discount_type = models.CharField(max_length=30)
    apply_for = models.CharField(max_length=30)
    product = models.ForeignKey(Product,on_delete=models.CASCADE,null=True,blank=True,related_name="offers")
    category = models.ForeignKey(Category,on_delete=models.CASCADE,null=True,blank=True,related_name="offers")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title