from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from products.models import Category, Brand, Product
from cart.models import Cart, CartItem


class OrderAPITest(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            email="test@example.com",
            password="Test@1234",
            full_name="Test User"
        )

        # Create a test category
        self.category = Category.objects.create(
            name="Test Category"
        )

        # Create a test brand
        self.brand = Brand.objects.create(
            name="Test Brand"
        )

        # Create a test product
        self.product = Product.objects.create(
            product_name="Test Product",
            sku="TEST-001",
            brand=self.brand,
            category=self.category,
            base_price=1000,
            stock=10
        )

        # Create a cart for the test user
        self.cart = Cart.objects.create(
            user=self.user
        )

        # Add product to cart
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1
        )

        # Create API client
        self.client = APIClient()

        # Login the test user
        self.client.force_authenticate(user=self.user)

    def test_create_order(self):
        # Send order creation request
        response = self.client.post(
            "/api/orders/create/",
            {
                "shipping_address_id": 1
            },
            format="json"
        )

        # Check that order was created successfully
        self.assertEqual(response.status_code, 201)