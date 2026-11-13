import api from "./api";

/**
 * Fetch all saved delivery addresses for the authenticated customer
 */
export const getAddresses = async () => {
  const response = await api.get("/accounts/addresses/");
  return response.data;
};

/**
 * Add a new delivery address
 * @param {Object} addressData
 */
export const addAddress = async (addressData) => {
  const response = await api.post("/accounts/address/add/", addressData);
  return response.data;
};

/**
 * Update an existing delivery address
 * @param {number} addressId
 * @param {Object} addressData
 */
export const updateAddress = async (addressId, addressData) => {
  const response = await api.put(`/accounts/address/${addressId}/update/`, addressData);
  return response.data;
};

/**
 * Delete a delivery address
 * @param {number} addressId
 */
export const deleteAddress = async (addressId) => {
  const response = await api.delete(`/accounts/address/${addressId}/delete/`);
  return response.data;
};

/**
 * Create a new customer order from the active cart
 * @param {Object} params
 * @param {number} params.shippingAddressId
 */
export const createOrder = async ({ shippingAddressId }) => {
  const response = await api.post("/orders/create/", {
    shipping_address_id: shippingAddressId,
  });
  return response.data;
};

/**
 * Create a payment record for an order
 * Supported methods: 'cod', 'razorpay'
 * @param {Object} params
 * @param {number} params.orderId
 * @param {string} params.paymentMethod
 * @param {number|null} [params.couponId]
 */
export const createPayment = async ({ orderId, paymentMethod, couponId = null }) => {
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
 * Fetch customer's personal order history
 */
export const getMyOrders = async () => {
  const response = await api.get("/orders/my-orders/");
  return response.data;
};

/**
 * Fetch details of a specific order
 * @param {number} orderId
 */
export const getOrderDetail = async (orderId) => {
  const response = await api.get(`/orders/${orderId}/`);
  return response.data;
};

/**
 * Cancel a pending customer order
 * @param {number} orderId
 */
export const cancelOrder = async (orderId) => {
  const response = await api.put(`/orders/${orderId}/cancel/`);
  return response.data;
};

