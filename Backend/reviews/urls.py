from django.urls import path
from .views import (
    create_review,
    product_reviews, 
    update_review, 
    delete_review,
    admin_reviews,

)

urlpatterns = [
    path("create/", create_review, name="create_review"),
    path("product/<int:product_id>/", product_reviews, name="product_reviews"),
    path("<int:review_id>/update/", update_review, name="update_review"),
    path("<int:review_id>/delete/", delete_review, name="delete_review"),
    path("admin/", admin_reviews, name="admin_reviews"),
    path("admin/<int:review_id>/", admin_reviews, name="admin_review_detail"),
]