import logging
from decimal import Decimal
import razorpay
from razorpay.errors import SignatureVerificationError, BadRequestError, GatewayError
from django.conf import settings

logger = logging.getLogger(__name__)


class RazorpayService:
    """
    Dedicated encapsulation for Razorpay Payment Gateway interactions.
    Handles order creation, signature verification, payment fetching, capture, and refunds.
    """

    def __init__(self):
        self.key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        self.key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        self.webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        self.currency = getattr(settings, "RAZORPAY_CURRENCY", "INR")

        if self.is_configured:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
        else:
            self.client = None
            logger.warning(
                "Razorpay client initialized with placeholder or missing credentials. "
                "Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set."
            )

    @property
    def is_configured(self) -> bool:
        """Returns True if valid non-placeholder keys are present."""
        return bool(
            self.key_id
            and self.key_secret
            and not self.key_id.endswith("_placeholder")
            and not self.key_secret.endswith("_placeholder")
        )

    def to_paise(self, amount) -> int:
        """
        Converts decimal currency to smallest subunit (paise for INR).
        Rounds cleanly to prevent floating-point inaccuracy.
        """
        decimal_amount = Decimal(str(amount))
        return int((decimal_amount * 100).quantize(Decimal("1")))

    def create_order(self, amount, receipt: str, notes: dict = None) -> dict:
        """
        Creates an order on Razorpay.
        amount: Decimal or float in INR.
        receipt: Order identifier (e.g. order_number).
        """
        amount_in_paise = self.to_paise(amount)
        notes = notes or {}

        payload = {
            "amount": amount_in_paise,
            "currency": self.currency,
            "receipt": str(receipt)[:40],
            "notes": notes,
            "payment_capture": 1,  # Auto-capture on success
        }

        if not self.is_configured:
            # Safe simulated test order ID for development environments without live credentials
            logger.info("Using simulated Razorpay Order ID for test environment.")
            return {
                "id": f"order_sim_{receipt}_{amount_in_paise}",
                "entity": "order",
                "amount": amount_in_paise,
                "amount_paid": 0,
                "amount_due": amount_in_paise,
                "currency": self.currency,
                "receipt": str(receipt),
                "status": "created",
                "notes": notes,
                "simulated": True,
            }

        try:
            order = self.client.order.create(data=payload)
            return order
        except Exception as e:
            logger.error(f"Razorpay Order Creation Failed: {str(e)}", exc_info=True)
            raise

    def verify_payment_signature(
        self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
    ) -> bool:
        """
        Verifies Razorpay HMAC SHA256 payment signature.
        Returns True on valid signature, False otherwise.
        """
        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            return False

        # Support simulated orders in local mock development
        if (
            not self.is_configured
            and razorpay_order_id.startswith("order_sim_")
            and razorpay_signature.startswith("sim_sig_")
        ):
            return True

        if not self.client:
            return False

        try:
            self.client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )
            return True
        except SignatureVerificationError:
            logger.warning(
                f"Invalid Razorpay Signature: order={razorpay_order_id}, pay={razorpay_payment_id}"
            )
            return False
        except Exception as e:
            logger.error(f"Error checking payment signature: {str(e)}")
            return False

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        """
        Verifies Razorpay webhook HMAC SHA256 signature against RAZORPAY_WEBHOOK_SECRET.
        """
        if not raw_body or not signature:
            return False

        if not self.webhook_secret or self.webhook_secret.endswith("_placeholder"):
            logger.warning("Webhook secret is unconfigured. Webhook verification failed.")
            return False

        try:
            body_str = raw_body.decode("utf-8") if isinstance(raw_body, bytes) else str(raw_body)
            self.client.utility.verify_webhook_signature(
                body_str, signature, self.webhook_secret
            )
            return True
        except SignatureVerificationError:
            logger.warning("Invalid Razorpay Webhook signature.")
            return False
        except Exception as e:
            logger.error(f"Error checking webhook signature: {str(e)}")
            return False

    def fetch_payment(self, razorpay_payment_id: str) -> dict:
        """
        Fetches payment object from Razorpay to verify capture state and amount.
        """
        if not self.is_configured:
            # Simulated payment state for local testing
            if razorpay_payment_id.startswith("pay_sim_"):
                return {
                    "id": razorpay_payment_id,
                    "status": "captured",
                    "amount": 0,
                    "currency": self.currency,
                    "captured": True,
                }
            return {}

        try:
            payment = self.client.payment.fetch(razorpay_payment_id)
            return payment
        except Exception as e:
            logger.error(f"Failed to fetch Razorpay payment {razorpay_payment_id}: {str(e)}")
            raise

    def capture_payment(self, razorpay_payment_id: str, amount) -> dict:
        """
        Captures an authorized payment if not auto-captured.
        """
        amount_in_paise = self.to_paise(amount)
        if not self.is_configured:
            return {"id": razorpay_payment_id, "status": "captured"}

        try:
            return self.client.payment.capture(razorpay_payment_id, amount_in_paise, {"currency": self.currency})
        except Exception as e:
            logger.error(f"Failed to capture payment {razorpay_payment_id}: {str(e)}")
            raise

    def create_refund(self, razorpay_payment_id: str, amount, notes: dict = None) -> dict:
        """
        Creates a refund via Razorpay Refund API.
        amount: Decimal/float in INR
        """
        amount_in_paise = self.to_paise(amount)
        notes = notes or {}

        payload = {
            "amount": amount_in_paise,
            "notes": notes,
        }

        if not self.is_configured:
            logger.info("Simulating Razorpay refund in development mode.")
            return {
                "id": f"rfnd_sim_{razorpay_payment_id}",
                "entity": "refund",
                "amount": amount_in_paise,
                "currency": self.currency,
                "payment_id": razorpay_payment_id,
                "status": "processed",
                "acquirer_data": {"arn": "ARN-SIM-984210"},
            }

        try:
            refund = self.client.payment.refund(razorpay_payment_id, payload)
            return refund
        except Exception as e:
            logger.error(f"Failed to issue Razorpay refund for {razorpay_payment_id}: {str(e)}")
            raise

    def fetch_refund(self, razorpay_refund_id: str) -> dict:
        """
        Fetches refund details from Razorpay.
        """
        if not self.is_configured:
            return {"id": razorpay_refund_id, "status": "processed"}

        try:
            return self.client.refund.fetch(razorpay_refund_id)
        except Exception as e:
            logger.error(f"Failed to fetch refund {razorpay_refund_id}: {str(e)}")
            raise


# Export singleton instance
razorpay_service = RazorpayService()
