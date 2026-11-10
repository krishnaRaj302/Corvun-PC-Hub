from django.db import models


class Banner(models.Model):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
    )

    title = models.CharField(max_length=255)
    image = models.CharField(max_length=255)
    cta_text = models.CharField(max_length=100, blank=True, default="Shop Now")
    link = models.CharField(max_length=255, blank=True, default="/products")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="active")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

