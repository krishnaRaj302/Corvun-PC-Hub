from django.urls import path
from .views import create_referral, my_referrals, admin_referrals


urlpatterns = [
    path("create/", create_referral, name="create_referral"),
    path("my-referrals/", my_referrals, name="my_referrals"),
    path("admin/", admin_referrals, name="admin_referrals"),
]