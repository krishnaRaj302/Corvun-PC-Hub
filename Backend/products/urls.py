from django.urls import path
from .views import (
    product_list, 
    category_list, 
    brand_list,
    product_detail,
    create_product,
    update_product,
)

urlpatterns = [
    path("", product_list, name="product_list"),
    path("<int:product_id>/", product_detail, name="product_detail"),
    path("categories/", category_list, name="category_list"),
    path("brands/", brand_list, name="brand_list"),
    path("create/", create_product, name="create_product"),
    path("<int:product_id>/update/", update_product, name="update_product"),
]