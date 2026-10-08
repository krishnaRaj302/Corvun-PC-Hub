from django.urls import path
from .views import banner_list, admin_banners


urlpatterns = [
    path("banners/", banner_list, name="banner_list"),
    path("admin/", admin_banners, name="admin_banners"),
    path("admin/<int:banner_id>/", admin_banners, name="admin_banner_detail"),
]