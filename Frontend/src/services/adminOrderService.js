import api from "./api";

/**
 * Fetch all orders for admin with optional pagination, search, and status filters.
 */
export const getAdminOrders = async (params = {}) => {
  const response = await api.get("/orders/admin/orders/", { params });
  return response.data;
};

/**
 * Fetch complete order details for a specific order.
 */
export const getAdminOrderDetail = async (orderId) => {
  const response = await api.get(`/orders/admin/orders/${orderId}/`);
  return response.data;
};

/**
 * Update order status (pending, confirmed, processing, shipped, delivered, cancelled)
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  const response = await api.put(`/orders/admin/orders/${orderId}/status/`, {
    status: newStatus,
  });
  return response.data;
};
