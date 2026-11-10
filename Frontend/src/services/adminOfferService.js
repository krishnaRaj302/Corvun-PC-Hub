import api from "./api";

/**
 * Fetch offers with optional query params (page, page_size, search, status, paginate).
 */
export const getAdminOffers = async (params = {}) => {
  const response = await api.get("/promotions/admin/offers/", { params });
  return response.data;
};

/**
 * Create a new offer.
 */
export const createAdminOffer = async (offerData) => {
  const response = await api.post("/promotions/admin/offers/", offerData);
  return response.data;
};

/**
 * Update an existing offer.
 */
export const updateAdminOffer = async (offerId, offerData) => {
  const response = await api.put(
    `/promotions/admin/offers/${offerId}/`,
    offerData
  );
  return response.data;
};

/**
 * Delete an offer by ID.
 */
export const deleteAdminOffer = async (offerId) => {
  const response = await api.delete(`/promotions/admin/offers/${offerId}/`);
  return response.data;
};
