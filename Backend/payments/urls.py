from django.urls import path
from .views import create_payment,create_refund,admin_refunds


urlpatterns = [
    path("create/", create_payment, name="create_payment"),
     path("refund/create/", create_refund, name="create_refund"),
     path("admin/refunds/", admin_refunds, name="admin_refunds"),
     path("admin/refunds/<int:refund_id>/", admin_refunds, name="admin_refund_detail"),
]