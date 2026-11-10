import api from "./api";

/**
 * Add a product/variant to the user's cart
 * @param {Object} params
 * @param {number} params.productId
 * @param {number|null} [params.variantId]
 * @param {number} [params.quantity=1]
 */
export const addToCart = async ({ productId, variantId = null, quantity = 1 }) => {
  const payload = {
    product_id: productId,
    quantity,
  };
  if (variantId) {
    payload.variant_id = variantId;
  }
  const response = await api.post("/cart/add/", payload);
  return response.data;
};

/**
 * Fetch current user's cart
 */
export const getCart = async () => {
  const response = await api.get("/cart/");
  return response.data;
};

/**
 * Add a product to the user's wishlist
 * @param {number} productId
 */
export const addToWishlist = async (productId) => {
  const response = await api.post("/cart/wishlist/add/", {
    product_id: productId,
  });
  return response.data;
};

/**
 * Fetch current user's wishlist
 */
export const getWishlist = async () => {
  const response = await api.get("/cart/wishlist/");
  return response.data;
};

/**
 * Remove an item from the user's wishlist
 * @param {number} itemId
 */
export const removeFromWishlist = async (itemId) => {
  const response = await api.delete(`/cart/wishlist/remove/${itemId}/`);
  return response.data;
};
