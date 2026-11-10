import api from "./api";

/**
 * Fetch all users with optional search query
 * @param {Object} params - { search: string }
 * @returns {Promise<Object>} { users: Array }
 */
export const getAdminUsers = async (params = {}) => {
  const response = await api.get("/accounts/admin/users/", { params });
  return response.data;
};

/**
 * Block a user (sets status="blocked", is_active=False)
 * @param {number|string} userId
 */
export const blockAdminUser = async (userId) => {
  const response = await api.patch(`/accounts/admin/users/${userId}/block/`);
  return response.data;
};

/**
 * Unblock a user (sets status="active", is_active=True)
 * @param {number|string} userId
 */
export const unblockAdminUser = async (userId) => {
  const response = await api.patch(`/accounts/admin/users/${userId}/unblock/`);
  return response.data;
};
