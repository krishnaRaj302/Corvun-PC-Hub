import api from "./api";

// Fetch paginated products with optional search, category, brand, sort, page
export const getProducts = async (params = {}) => {
  const response = await api.get("/products/", { params });
  return response.data;
};

// Fetch single product details with variants, images, specifications
export const getProductDetail = async (productId) => {
  const response = await api.get(`/products/${productId}/`);
  return response.data;
};

// Fetch categories
export const getCategories = async () => {
  const response = await api.get("/products/categories/");
  return response.data;
};

// Fetch brands
export const getBrands = async () => {
  const response = await api.get("/products/brands/");
  return response.data;
};

// Fetch banners for homepage
export const getBanners = async () => {
  const response = await api.get("/content/banners/");
  return response.data;
};

// Fetch public approved reviews for a product
export const getProductReviews = async (productId) => {
  const response = await api.get(`/reviews/product/${productId}/`);
  return response.data;
};

// Submit a new review for a product (requires user authentication)
export const submitProductReview = async (reviewData) => {
  const response = await api.post("/reviews/create/", reviewData);
  return response.data;
};
