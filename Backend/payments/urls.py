from django.urls import path
from .views import (
    create_payment,
    verify_payment,
    payment_failure,
    razorpay_webhook,
    create_refund,
    admin_refunds,
    admin_payments,
    admin_payment_detail,
    admin_refund_detail,
)


urlpatterns = [
    path("create/", create_payment, name="create_payment"),
    path("verify/", verify_payment, name="verify_payment"),
    path("failure/", payment_failure, name="payment_failure"),
    path("webhook/", razorpay_webhook, name="razorpay_webhook"),
    path("refund/create/", create_refund, name="create_refund"),
    path("admin/refunds/", admin_refunds, name="admin_refunds"),
    path("admin/refunds/<int:refund_id>/", admin_refunds, name="admin_refund_update"),
    path("admin/refunds/<int:refund_id>/detail/", admin_refund_detail, name="admin_refund_detail"),
    path("admin/payments/", admin_payments, name="admin_payments"),
    path("admin/payments/<int:payment_id>/", admin_payment_detail, name="admin_payment_detail"),
]
