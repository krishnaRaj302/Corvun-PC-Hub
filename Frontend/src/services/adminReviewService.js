import api from "./api";

/**
 * Fetch paginated reviews for admin with optional filters (page, page_size, search, status, rating).
 * Returns { reviews, count, page, page_size, total_pages, stats }.
 */
export const getAdminReviews = async (params = {}) => {
  const response = await api.get("/reviews/admin/", { params });
  return response.data;
};

/**
 * Fetch single review detail by ID.
 * Returns { review }.
 */
export const getAdminReviewDetail = async (reviewId) => {
  const response = await api.get(`/reviews/admin/${reviewId}/`);
  return response.data;
};

/**
 * Moderate / update review status, moderation notes, or votes.
 * updateData: { status: "approved" | "rejected" | "reported" | "pending", moderation_notes?: string }
 */
export const updateAdminReview = async (reviewId, updateData) => {
  const response = await api.patch(`/reviews/admin/${reviewId}/`, updateData);
  return response.data;
};

/**
 * Delete a review permanently.
 */
export const deleteAdminReview = async (reviewId) => {
  const response = await api.delete(`/reviews/admin/${reviewId}/`);
  return response.data;
};

/**
 * Download real review records as CSV.
 */
export const exportAdminReviewsCSV = async (params = {}) => {
  const response = await api.get("/reviews/admin/", {
    params: { ...params, export: true },
    responseType: "blob",
  });

  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("download", `corvun_reviews_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
