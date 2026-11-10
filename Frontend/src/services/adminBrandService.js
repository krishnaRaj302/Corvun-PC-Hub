import api from "./api";

/**
 * Fetch brands with optional query parameters (page, page_size, search, status, paginate: true)
 */
export const getBrands = async (params = {}) => {
  const response = await api.get("/products/brands/", { params });
  return response.data;
};

/**
 * Create a new brand
 * data can be a plain object or FormData (for file uploads)
 */
export const createBrand = async (brandData) => {
  const isFormData = brandData instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};
  const response = await api.post("/products/admin/brands/", brandData, config);
  return response.data;
};

/**
 * Update an existing brand
 * data can be a plain object or FormData (for file uploads)
 */
export const updateBrand = async (brandId, brandData) => {
  const isFormData = brandData instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};
  const response = await api.put(`/products/admin/brands/${brandId}/`, brandData, config);
  return response.data;
};

/**
 * Delete a brand by ID
 */
export const deleteBrand = async (brandId) => {
  const response = await api.delete(`/products/admin/brands/${brandId}/`);
  return response.data;
};

/**
 * Dedicated logo upload endpoint (optional helper)
 */
export const uploadBrandLogo = async (file) => {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await api.post("/products/admin/brands/upload-logo/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
