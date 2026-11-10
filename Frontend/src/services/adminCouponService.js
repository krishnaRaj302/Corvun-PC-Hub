import api from "./api";

/**
 * Fetch coupons with optional query params (page, page_size, search, status, discount_type, paginate).
 */
export const getAdminCoupons = async (params = {}) => {
  const response = await api.get("/promotions/admin/coupons/", { params });
  return response.data;
};

/**
 * Fetch a single coupon by ID.
 */
export const getAdminCouponDetail = async (couponId) => {
  const response = await api.get(`/promotions/admin/coupons/${couponId}/`);
  return response.data;
};

/**
 * Create a new coupon.
 */
export const createAdminCoupon = async (couponData) => {
  const response = await api.post("/promotions/admin/coupons/", couponData);
  return response.data;
};

/**
 * Update an existing coupon.
 */
export const updateAdminCoupon = async (couponId, couponData) => {
  const response = await api.put(
    `/promotions/admin/coupons/${couponId}/`,
    couponData
  );
  return response.data;
};

/**
 * Delete a coupon by ID.
 */
export const deleteAdminCoupon = async (couponId) => {
  const response = await api.delete(
    `/promotions/admin/coupons/${couponId}/`
  );
  return response.data;
};
