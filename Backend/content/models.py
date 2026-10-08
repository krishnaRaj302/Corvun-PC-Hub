from django.db import models


class Banner(models.Model):
    title = models.CharField(max_length=255)
    image = models.CharField(max_length=255)
    link = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, default="active")
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
