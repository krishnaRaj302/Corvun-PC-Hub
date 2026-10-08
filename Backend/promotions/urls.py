from django.urls import path
from .views import validate_coupon,apply_coupon


urlpatterns = [
    path("validate/", validate_coupon, name="validate_coupon"),
    path("apply/", apply_coupon, name="apply_coupon"),
]