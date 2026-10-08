from django.db import models


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