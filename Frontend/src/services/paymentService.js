import api from "./api";

/**
 * Dynamically load the official Razorpay Checkout SDK script
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // If already loaded on window
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK script from CDN.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Initialize payment on the backend
 * @param {Object} params
 * @param {number} params.orderId
 * @param {string} [params.paymentMethod='razorpay']
 * @param {number|null} [params.couponId]
 */
export const initializePayment = async ({ orderId, paymentMethod = "razorpay", couponId = null }) => {
  const payload = {
    order_id: orderId,
    payment_method: paymentMethod,
  };
  if (couponId) {
    payload.coupon_id = couponId;
  }
  const response = await api.post("/payments/create/", payload);
  return response.data;
};

/**
 * Send Razorpay authorization telemetry to backend for cryptographic HMAC verification
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 */
export const verifyPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const response = await api.post("/payments/verify/", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  return response.data;
};

/**
 * Notify backend of a client-side payment cancellation or gateway error
 * @param {Object} params
 */
export const reportPaymentFailure = async ({
  orderId,
  razorpay_order_id,
  razorpay_payment_id,
  error_code,
  error_description,
}) => {
  try {
    const response = await api.post("/payments/failure/", {
      order_id: orderId,
      razorpay_order_id,
      razorpay_payment_id,
      error_code,
      error_description,
    });
    return response.data;
  } catch (err) {
    console.warn("Could not report payment failure telemetry:", err);
    return null;
  }
};
