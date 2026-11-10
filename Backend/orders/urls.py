from django.urls import path
from .views import (
    create_order,
    my_orders,
    order_detail,
    update_order_status,
    cancel_order,
    admin_orders,
    admin_order_detail,
    admin_dashboard_stats,
    admin_sales_report,
)

urlpatterns = [
    path("create/", create_order, name="create_order"),
    path("my-orders/", my_orders, name="my_orders"),
    path("<int:order_id>/", order_detail, name="order_detail"),
    path("<int:order_id>/status/", update_order_status, name="update_order_status"),
    path("<int:order_id>/cancel/", cancel_order, name="cancel_order"),
    path("admin/orders/", admin_orders, name="admin_orders"),
    path("admin/orders/<int:order_id>/", admin_order_detail, name="admin_order_detail"),
    path("admin/orders/<int:order_id>/status/", update_order_status, name="admin_update_order_status"),
    path("admin/dashboard/", admin_dashboard_stats, name="admin_dashboard_stats"),
    path("admin/sales-report/", admin_sales_report, name="admin_sales_report"),
    path("admin/sales/", admin_sales_report, name="admin_sales_report_alias"),
]