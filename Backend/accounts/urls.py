from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    signup,
    login,
    profile,
    logout,
    verify_otp,
    forgot_password,
    verify_reset_otp,
    reset_password,
    admin_test,
    admin_users,
    block_user,
    unblock_user,
    admin_user_detail,
    add_address,
    get_addresses,
    update_address,
    delete_address,
)


urlpatterns = [

    # Authentication
    path("signup/", signup, name="signup"),
    path("login/", login, name="login"),
    path("logout/", logout, name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Email Verification
    path("verify-otp/", verify_otp, name="verify_otp"),

    # Password Reset
    path("forgot-password/", forgot_password, name="forgot_password"),
    path("verify-reset-otp/", verify_reset_otp, name="verify_reset_otp"),
    path("reset-password/", reset_password, name="reset_password"),

    # User Profile
    path("profile/", profile, name="profile"),

    # Admin
    path("admin-test/", admin_test, name="admin_test"),
    path("admin/users/", admin_users, name="admin_users"),
    path("admin/users/<int:user_id>/",admin_user_detail,name="admin_user_detail",),
    path("admin/users/<int:user_id>/block/",block_user,name="block_user",),
    path("admin/users/<int:user_id>/unblock/",unblock_user,name="unblock_user",),

    # Addresses
    path("addresses/", get_addresses, name="get_addresses"),
    path("address/add/", add_address, name="add_address"),
    path("address/<int:address_id>/update/",update_address,name="update_address",),
    path("address/<int:address_id>/delete/",delete_address,name="delete_address",),
]