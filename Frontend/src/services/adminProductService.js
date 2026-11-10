import api from "./api";

// ----------------------------------------
// Admin Products API Service
// ----------------------------------------

// Fetch products with optional filtering/pagination
export const getAdminProducts = async (params = {}) => {
  const response = await api.get("/products/", { params });
  return response.data;
};

// Fetch single product detail
export const getAdminProductDetail = async (productId) => {
  const response = await api.get(`/products/${productId}/`);
  return response.data;
};

// Create Product
export const createAdminProduct = async (productData) => {
  const response = await api.post("/products/create/", productData);
  return response.data;
};

// Update Product
export const updateAdminProduct = async (productId, productData) => {
  const response = await api.put(`/products/${productId}/update/`, productData);
  return response.data;
};

// Delete Product
export const deleteAdminProduct = async (productId) => {
  const response = await api.delete(`/products/${productId}/delete/`);
  return response.data;
};

// Fetch low stock products
export const getLowStockProducts = async () => {
  const response = await api.get("/products/admin/low-stock/");
  return response.data;
};

// ----------------------------------------
// Variants API
// ----------------------------------------
export const createAdminVariant = async (variantData) => {
  const response = await api.post("/products/variants/create/", variantData);
  return response.data;
};

export const updateAdminVariant = async (variantId, variantData) => {
  const response = await api.put(`/products/variants/${variantId}/update/`, variantData);
  return response.data;
};

export const deleteAdminVariant = async (variantId) => {
  const response = await api.delete(`/products/variants/${variantId}/delete/`);
  return response.data;
};

// ----------------------------------------
// Images API
export const uploadAdminProductImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post("/products/images/upload/", formData);
  return response.data;
};

export const createAdminImage = async (imageData) => {
  const response = await api.post("/products/images/create/", imageData);
  return response.data;
};

export const deleteAdminImage = async (imageId) => {
  const response = await api.delete(`/products/images/${imageId}/delete/`);
  return response.data;
};

// ----------------------------------------
// Specifications API
// ----------------------------------------
export const createAdminSpecification = async (specData) => {
  const response = await api.post("/products/specifications/create/", specData);
  return response.data;
};

export const deleteAdminSpecification = async (specId) => {
  const response = await api.delete(`/products/specifications/${specId}/delete/`);
  return response.data;
};

// ----------------------------------------
// Categories & Brands
// ----------------------------------------
export const getAdminCategories = async () => {
  const response = await api.get("/products/categories/");
  return response.data;
};

export const createAdminCategory = async (categoryData) => {
  const response = await api.post("/products/categories/create/", categoryData);
  return response.data;
};

export const getAdminBrands = async () => {
  const response = await api.get("/products/brands/");
  return response.data;
};

export const createAdminBrand = async (brandData) => {
  const response = await api.post("/products/brands/create/", brandData);
  return response.data;
};

// ----------------------------------------
// Admin Users API
// ----------------------------------------
export const getAdminUsers = async (search = "") => {
  const response = await api.get("/accounts/admin/users/", {
    params: search ? { search } : {},
  });
  return response.data;
};
