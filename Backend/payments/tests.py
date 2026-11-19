import json
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from orders.models import Order, OrderItem
from products.models import Product, Category, Brand, ProductVariant
from cart.models import Cart, CartItem
from accounts.models import Address
from payments.models import Payment, Refund, WebhookEvent

User = get_user_model()


class RazorpayPaymentSecurityTestCase(TestCase):
    """
    Comprehensive test suite verifying Razorpay payment lifecycle,
    inventory safety, transaction atomicity, signature verification,
    idempotency, webhooks, and refund limits.
    """

    def setUp(self):
        self.client = APIClient()

        # Create test users
        self.user1 = User.objects.create_user(
            email="builder1@corvun.com",
            full_name="Vikramaditya Rao",
            password="StrongPassword123!",
            phone="+919884012345"
        )
        self.user2 = User.objects.create_user(
            email="builder2@corvun.com",
            full_name="Aarav Sharma",
            password="StrongPassword123!",
            phone="+919884054321"
        )
        self.admin = User.objects.create_superuser(
            email="admin@corvun.com",
            full_name="Security Admin",
            password="AdminPassword123!"
        )

        # Create Category & Brand
        self.category = Category.objects.create(name="GPU", description="Graphics Processing Units")
        self.brand = Brand.objects.create(name="NVIDIA")

        # Create Product with 5 in stock
        self.product = Product.objects.create(
            category=self.category,
            brand=self.brand,
            product_name="RTX 4070 Dual Fan",
            sku="SKU-RTX-4070",
            base_price=Decimal("54999.00"),
            stock=5,
            status="active"
        )

        # Create Address
        self.address = Address.objects.create(
            user=self.user1,
            full_name="Vikramaditya Rao",
            phone="+919884012345",
            address_line1="Brigade Gateway Campus",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560055",
            country="India"
        )

        # Create user Cart and CartItem
        self.cart = Cart.objects.create(user=self.user1)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2
        )

        # Create Order for user 1
        self.order = Order.objects.create(
            user=self.user1,
            order_number="ORD-TEST-99210",
            shipping_address_id=self.address.id,
            subtotal=Decimal("109998.00"),
            discount_amount=Decimal("0.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("109998.00"),
            status="pending",
            payment_status="pending"
        )

        self.order_item = OrderItem.objects.create(
            order=self.order,
            product_name=self.product.product_name,
            variant_name="",
            sku=self.product.sku,
            quantity=2,
            unit_price=self.product.base_price,
            total_amount=Decimal("109998.00"),
            item_status="pending"
        )

    # 1. Successful Razorpay payment initialization
    @patch("payments.views.razorpay_service.create_order")
    def test_payment_initialization_success(self, mock_create_order):
        mock_create_order.return_value = {
            "id": "order_mock_test_123",
            "amount": 10999800,
            "currency": "INR",
            "status": "created",
        }

        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/payments/create/", {
            "order_id": self.order.id,
            "payment_method": "razorpay"
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["razorpay_order_id"], "order_mock_test_123")
        self.assertEqual(data["amount"], 10999800)
        self.assertEqual(data["currency"], "INR")

        # Verify Payment record in DB
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.razorpay_order_id, "order_mock_test_123")
        self.assertEqual(payment.status, "pending")

    # 2. Duplicate payment initialization protection
    @patch("payments.views.razorpay_service.create_order")
    def test_payment_initialization_duplicate_prevention(self, mock_create_order):
        mock_create_order.return_value = {
            "id": "order_mock_test_reuse_1",
            "amount": 10999800,
            "currency": "INR",
        }

        self.client.force_authenticate(user=self.user1)
        # First call
        res1 = self.client.post("/api/payments/create/", {
            "order_id": self.order.id,
            "payment_method": "razorpay"
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second call (retry or double click)
        res2 = self.client.post("/api/payments/create/", {
            "order_id": self.order.id,
            "payment_method": "razorpay"
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Only one payment record should exist for this order
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        # create_order on gateway should only be called once
        mock_create_order.assert_called_once()

    # 3. Unauthorized access to another user's order
    def test_payment_initialization_cross_user_protection(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post("/api/payments/create/", {
            "order_id": self.order.id,
            "payment_method": "razorpay"
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 4. Valid payment verification and inventory safety
    @patch("payments.views.razorpay_service.verify_payment_signature")
    def test_payment_verification_valid_signature(self, mock_verify_sig):
        mock_verify_sig.return_value = True

        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=self.order.total_amount,
            currency="INR",
            razorpay_order_id="order_mock_valid_99",
            status="pending"
        )

        initial_stock = self.product.stock  # 5
        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/payments/verify/", {
            "razorpay_order_id": "order_mock_valid_99",
            "razorpay_payment_id": "pay_mock_valid_99",
            "razorpay_signature": "sig_valid_hex_12345"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json().get("verified"))

        # Verify DB updates
        payment.refresh_from_db()
        self.order.refresh_from_db()
        self.product.refresh_from_db()

        self.assertEqual(payment.status, "completed")
        self.assertEqual(payment.razorpay_payment_id, "pay_mock_valid_99")
        self.assertEqual(self.order.payment_status, "completed")
        self.assertEqual(self.order.status, "processing")

        # Inventory must be deducted exactly once: 5 - 2 = 3
        self.assertEqual(self.product.stock, initial_stock - 2)

        # Cart items must be cleared
        self.assertFalse(CartItem.objects.filter(cart=self.cart).exists())

    # 5. Invalid signature rejection
    @patch("payments.views.razorpay_service.verify_payment_signature")
    def test_payment_verification_invalid_signature(self, mock_verify_sig):
        mock_verify_sig.return_value = False

        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=self.order.total_amount,
            currency="INR",
            razorpay_order_id="order_tampered_1",
            status="pending"
        )

        initial_stock = self.product.stock
        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/payments/verify/", {
            "razorpay_order_id": "order_tampered_1",
            "razorpay_payment_id": "pay_tampered_1",
            "razorpay_signature": "fake_forged_signature"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        payment.refresh_from_db()
        self.product.refresh_from_db()

        self.assertEqual(payment.status, "failed")
        self.assertEqual(payment.error_code, "INVALID_SIGNATURE")
        # Stock must NOT be deducted
        self.assertEqual(self.product.stock, initial_stock)

    # 6. Idempotent verification replay protection
    @patch("payments.views.razorpay_service.verify_payment_signature")
    def test_payment_verification_replay_idempotency(self, mock_verify_sig):
        mock_verify_sig.return_value = True

        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=self.order.total_amount,
            currency="INR",
            razorpay_order_id="order_replay_test",
            status="pending"
        )

        self.client.force_authenticate(user=self.user1)

        # First verification
        res1 = self.client.post("/api/payments/verify/", {
            "razorpay_order_id": "order_replay_test",
            "razorpay_payment_id": "pay_replay_test",
            "razorpay_signature": "sig_replay_test"
        })
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        stock_after_first = self.product.stock

        # Second verification (replay)
        res2 = self.client.post("/api/payments/verify/", {
            "razorpay_order_id": "order_replay_test",
            "razorpay_payment_id": "pay_replay_test",
            "razorpay_signature": "sig_replay_test"
        })
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        # Stock must NOT be deducted a second time
        self.assertEqual(self.product.stock, stock_after_first)

    # 7. Payment failure handler preserves pending order
    def test_payment_failure_recording(self):
        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=self.order.total_amount,
            currency="INR",
            razorpay_order_id="order_cancelled_user",
            status="pending"
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.post("/api/payments/failure/", {
            "razorpay_order_id": "order_cancelled_user",
            "error_code": "CUSTOMER_CLOSED_MODAL",
            "error_description": "User cancelled in browser."
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(payment.status, "failed")
        self.assertEqual(payment.error_code, "CUSTOMER_CLOSED_MODAL")
        # Order should remain in pending status so the user can retry
        self.assertEqual(self.order.status, "pending")

    # 8. Webhook event handling with signature verification
    @patch("payments.views.razorpay_service.verify_webhook_signature")
    def test_webhook_payment_captured_success(self, mock_webhook_sig):
        mock_webhook_sig.return_value = True

        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=self.order.total_amount,
            currency="INR",
            razorpay_order_id="order_webhook_flow_1",
            status="pending"
        )

        webhook_payload = {
            "id": "evt_test_101",
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_999",
                        "order_id": "order_webhook_flow_1",
                        "amount": 10999800,
                        "status": "captured",
                    }
                }
            }
        }

        response = self.client.post(
            "/api/payments/webhook/",
            data=json.dumps(webhook_payload),
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="valid_webhook_sig_hex"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(payment.status, "completed")
        self.assertEqual(payment.razorpay_payment_id, "pay_webhook_999")
        self.assertEqual(self.order.payment_status, "completed")

        # Duplicate event check
        response_dup = self.client.post(
            "/api/payments/webhook/",
            data=json.dumps(webhook_payload),
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="valid_webhook_sig_hex"
        )
        self.assertEqual(response_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(response_dup.json().get("status"), "ignored")

    # 9. Refund limit enforcement
    def test_refund_amount_limit_enforcement(self):
        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=Decimal("1000.00"),
            currency="INR",
            razorpay_order_id="order_for_refund",
            razorpay_payment_id="pay_for_refund",
            status="completed"
        )

        self.client.force_authenticate(user=self.user1)

        # Attempt to refund 1500 on a 1000 payment
        res_excess = self.client.post("/api/payments/refund/create/", {
            "payment_id": payment.id,
            "amount": "1500.00",
            "reason": "Accidental purchase"
        })
        self.assertEqual(res_excess.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid refund of 500
        res_valid = self.client.post("/api/payments/refund/create/", {
            "payment_id": payment.id,
            "amount": "500.00",
            "reason": "Return item"
        })
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)

    # 10. Admin automated Razorpay refund execution
    @patch("payments.views.razorpay_service.create_refund")
    def test_admin_refund_gateway_trigger(self, mock_create_refund):
        mock_create_refund.return_value = {
            "id": "rfnd_gateway_test_888",
            "amount": 50000,
            "currency": "INR",
            "status": "processed",
            "acquirer_data": {"arn": "ARN-HDFC-9912048"}
        }

        payment = Payment.objects.create(
            user=self.user1,
            order=self.order,
            payment_method="razorpay",
            amount=Decimal("1000.00"),
            currency="INR",
            razorpay_order_id="order_admin_rfnd",
            razorpay_payment_id="pay_admin_rfnd",
            status="completed"
        )

        refund = Refund.objects.create(
            payment=payment,
            order=self.order,
            amount=Decimal("500.00"),
            gateway="razorpay",
            reason="Customer requested return",
            status="pending"
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.put(f"/api/payments/admin/refunds/{refund.id}/", {
            "status": "approved"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refund.refresh_from_db()
        self.assertEqual(refund.status, "processed")
        self.assertEqual(refund.razorpay_refund_id, "rfnd_gateway_test_888")
        self.assertEqual(refund.arn, "ARN-HDFC-9912048")
        mock_create_refund.assert_called_once()
