import api from "./api";

/**
 * Fetch referrals list and KPI statistics for admin dashboard.
 */
export const getAdminReferrals = async (params = {}) => {
  const response = await api.get("/referrals/admin/", { params });
  return response.data;
};
