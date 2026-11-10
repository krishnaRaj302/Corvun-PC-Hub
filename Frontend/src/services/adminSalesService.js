import api from "./api";

/**
 * Fetch sales report data for the selected period.
 * @param {string} period - 'fixed', 'last_7_days', 'last_30_days', 'this_year'
 */
export const getAdminSalesReport = async (period = "last_30_days") => {
  const response = await api.get("/orders/admin/sales-report/", {
    params: { period },
  });
  return response.data;
};
