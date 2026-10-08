from django.db import models
from accounts.models import User
from orders.models import Order
from promotions.models import Coupon


class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="payments")
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    payment_method = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=30, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment - {self.order.order_number}"


class Refund(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="refunds")
    return_request_id = models.BigIntegerField(null=True, blank=True)
    refund_id = models.CharField(max_length=150, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    gateway = models.CharField(max_length=50)
    reason = models.TextField()
    status = models.CharField(max_length=30, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.refund_id