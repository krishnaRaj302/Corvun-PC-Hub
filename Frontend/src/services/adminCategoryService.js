import api from "./api";

/**
 * Fetch categories with optional query params (page, page_size, search, status).
 */
export const getAdminCategories = async (params = {}) => {
  const response = await api.get("/products/categories/", { params });
  return response.data;
};

/**
 * Create a new category
 */
export const createAdminCategory = async (categoryData) => {
  const response = await api.post("/products/categories/create/", categoryData);
  return response.data;
};

/**
 * Update an existing category
 */
export const updateAdminCategory = async (categoryId, categoryData) => {
  const response = await api.put(
    `/products/categories/${categoryId}/update/`,
    categoryData
  );
  return response.data;
};

/**
 * Delete a category by ID
 */
export const deleteAdminCategory = async (categoryId) => {
  const response = await api.delete(
    `/products/categories/${categoryId}/delete/`
  );
  return response.data;
};
