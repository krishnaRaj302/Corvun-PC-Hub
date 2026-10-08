from django.contrib import admin
from .models import (
    Category,
    Brand,
    Product,
    ProductVariant,
    ProductImage,
    ProductSpecification,
)


admin.site.register(Category)
admin.site.register(Brand)
admin.site.register(Product)
admin.site.register(ProductVariant)
admin.site.register(ProductImage)
admin.site.register(ProductSpecification)