from django.urls import path

from .views import (
    product_list,
    product_detail,
    create_product,
    update_product,
    delete_product,
    category_list,
    create_category,
    update_category,
    delete_category,
    brand_list,
    create_brand,
    update_brand,
    delete_brand,
    brand_admin_detail,
    upload_brand_logo,
    create_product_variant,
    update_product_variant,
    delete_product_variant,
    upload_product_image_file,
    create_product_image,
    delete_product_image,
    create_product_specification,
    delete_product_specification,
    low_stock_products,
)


urlpatterns = [

    # Products
    path("", product_list, name="product_list"),
    path("<int:product_id>/", product_detail, name="product_detail"),
    path("create/", create_product, name="create_product"),
    path("<int:product_id>/update/", update_product, name="update_product"),
    path("<int:product_id>/delete/", delete_product, name="delete_product"),

    # Categories
    path("categories/", category_list, name="category_list"),
    path("categories/create/", create_category, name="create_category"),
    path("categories/<int:category_id>/update/", update_category, name="update_category"),
    path("categories/<int:category_id>/delete/", delete_category, name="delete_category"),

    # Brands
    path("brands/", brand_list, name="brand_list"),
    path("brands/create/", create_brand, name="create_brand"),
    path("brands/upload-logo/", upload_brand_logo, name="upload_brand_logo"),
    path("brands/<int:brand_id>/update/", update_brand, name="update_brand"),
    path("brands/<int:brand_id>/delete/", delete_brand, name="delete_brand"),
    path("admin/brands/", create_brand, name="admin_create_brand"),
    path("admin/brands/<int:brand_id>/", brand_admin_detail, name="admin_brand_detail"),
    path("admin/brands/upload-logo/", upload_brand_logo, name="admin_upload_brand_logo"),

    # Variants
    path("variants/create/", create_product_variant, name="create_product_variant"),
    path("variants/<int:variant_id>/update/", update_product_variant, name="update_product_variant"),
    path("variants/<int:variant_id>/delete/", delete_product_variant, name="delete_product_variant"),

    # Images
    path("images/upload/", upload_product_image_file, name="upload_product_image_file"),
    path("images/create/", create_product_image, name="create_product_image"),
    path("images/<int:image_id>/delete/", delete_product_image, name="delete_product_image"),

    # Specifications
    path("specifications/create/", create_product_specification, name="create_product_specification"),
    path("specifications/<int:specification_id>/delete/", delete_product_specification, name="delete_product_specification"),

    # Admin
    path("admin/low-stock/", low_stock_products, name="low_stock_products"),
]