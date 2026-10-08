from django.urls import path
from .views import (
    add_to_cart,
    view_cart,
    update_cart_quantity,
    remove_cart_item,
    add_to_wishlist,
    view_wishlist,
    remove_from_wishlist,

    )

urlpatterns = [
    path("add/", add_to_cart, name="add_to_cart"),
    path("", view_cart, name="view_cart"),
    path("update/<int:item_id>/",update_cart_quantity,name="update_cart_quantity"),
    path("remove/<int:item_id>/",remove_cart_item,name="remove_cart_item"),
    path("wishlist/add/", add_to_wishlist, name="add_to_wishlist"),
    path("wishlist/", view_wishlist, name="view_wishlist"),
    path("wishlist/remove/<int:item_id>/", remove_from_wishlist, name="remove_from_wishlist"),
]