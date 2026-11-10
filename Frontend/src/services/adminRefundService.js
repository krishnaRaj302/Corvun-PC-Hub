import api from "./api";

/**
 * Fetch enriched admin refund list with summary stats.
 * Supports ?search=, ?status=, pagination params.
 */
export const getAdminRefunds = async (params = {}) => {
  const response = await api.get("/payments/admin/refunds/", { params });
  return response.data;
};

/**
 * Fetch full refund detail for admin modal.
 * Includes customer, payment, order items, shipping address.
 */
export const getAdminRefundDetail = async (refundId) => {
  const response = await api.get(`/payments/admin/refunds/${refundId}/detail/`);
  return response.data;
};

/**
 * Update refund status.
 * Allowed: pending | approved | processed | rejected
 */
export const updateRefundStatus = async (refundId, newStatus) => {
  const response = await api.put(`/payments/admin/refunds/${refundId}/`, {
    status: newStatus,
  });
  return response.data;
};
