from django.urls import path
from .views import validate_coupon, apply_coupon, offer_list, admin_offers


urlpatterns = [
    path("validate/", validate_coupon, name="validate_coupon"),
    path("apply/", apply_coupon, name="apply_coupon"),
    path("offers/", offer_list, name="offer_list"),
    path("admin/offers/", admin_offers, name="admin_offers"),
    path("admin/offers/<int:offer_id>/", admin_offers, name="admin_offer_detail"),
]