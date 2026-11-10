import api from "./api";

/**
 * Fetch admin payments list with optional search, status filter, and pagination.
 * Also returns KPI stats (total_transactions, total_revenue, total_refunds).
 */
export const getAdminPayments = async (params = {}) => {
  const response = await api.get("/payments/admin/payments/", { params });
  return response.data;
};

/**
 * Fetch a single payment record by ID.
 */
export const getAdminPaymentDetail = async (paymentId) => {
  const response = await api.get(`/payments/admin/payments/${paymentId}/`);
  return response.data;
};
