import api from "./api";

/**
 * Fetch paginated list of banners for admin.
 * @param {Object} params - { page, page_size }
 * @returns {Promise<Object>} { banners, count, page, page_size, total_pages }
 */
export const getAdminBanners = async (params = {}) => {
  const response = await api.get("/content/admin/", { params });
  return response.data;
};

/**
 * Fetch single banner by ID.
 * @param {number|string} bannerId
 * @returns {Promise<Object>} { banner }
 */
export const getAdminBannerDetail = async (bannerId) => {
  const response = await api.get(`/content/admin/${bannerId}/`);
  return response.data;
};

/**
 * Create a new banner (supports multipart/form-data with file upload).
 * @param {FormData} formData
 * @returns {Promise<Object>} { message, banner }
 */
export const createAdminBanner = async (formData) => {
  const response = await api.post("/content/admin/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

/**
 * Update an existing banner (supports multipart/form-data with file upload).
 * @param {number|string} bannerId
 * @param {FormData} formData
 * @returns {Promise<Object>} { message, banner }
 */
export const updateAdminBanner = async (bannerId, formData) => {
  const response = await api.put(`/content/admin/${bannerId}/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

/**
 * Delete a banner permanently.
 * @param {number|string} bannerId
 * @returns {Promise<Object>} { message }
 */
export const deleteAdminBanner = async (bannerId) => {
  const response = await api.delete(`/content/admin/${bannerId}/`);
  return response.data;
};
