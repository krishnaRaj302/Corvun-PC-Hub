from django.test import TestCase
from rest_framework.test import APIClient
from .models import Product, Category, Brand


class ProductAPITest(TestCase):

    def setUp(self):
        # Create API client
        self.client = APIClient()

        # Create test category
        self.category = Category.objects.create(
            name="Test Category"
        )

        # Create test brand
        self.brand = Brand.objects.create(
            name="Test Brand"
        )

        # Create test product
        self.product = Product.objects.create(
            product_name="Test Product",
            sku="TEST-001",
            brand=self.brand,
            category=self.category,
            base_price=1000,
            stock=10
        )

    def test_product_list_api(self):
        # Call the product list API
        response = self.client.get("/api/products/")

        # Check that API returns success
        self.assertEqual(response.status_code, 200)

    def test_product_detail_api(self):
        # Call the product detail API using our test product
        response = self.client.get(
            f"/api/products/{self.product.id}/"
        )

        # Check that API returns success
        self.assertEqual(response.status_code, 200)

            # Check that correct product was returned
        self.assertEqual(
            response.data["product"]["id"],
            self.product.id
    )