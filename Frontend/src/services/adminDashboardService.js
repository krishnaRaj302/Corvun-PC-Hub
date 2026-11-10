import api from "./api";

/**
 * Fetch aggregated dashboard metrics and analytics
 * @returns {Promise<Object>} {
 *   total_revenue,
 *   total_orders,
 *   active_users,
 *   conversion_rate,
 *   sales_overview: [{ month, year, revenue }],
 *   sales_by_category: [{ category, sales }],
 *   recent_orders: [{ id, order_number, customer, product, amount, status, created_at }]
 * }
 */
export const getAdminDashboardStats = async () => {
  const response = await api.get("/orders/admin/dashboard/");
  return response.data;
};
