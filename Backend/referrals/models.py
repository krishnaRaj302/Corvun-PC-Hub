from django.db import models
from accounts.models import User
from orders.models import Order


class Referral(models.Model):
    referrer = models.ForeignKey(User,on_delete=models.CASCADE,related_name="referrals_sent")
    referee = models.ForeignKey(User,on_delete=models.CASCADE,related_name="referrals_received")
    referral_code = models.CharField(max_length=50)
    status = models.CharField(max_length=30)
    reward_amount = models.DecimalField(max_digits=12,decimal_places=2)
    order = models.ForeignKey(Order,on_delete=models.SET_NULL,null=True,blank=True,related_name="referrals")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.referral_code
