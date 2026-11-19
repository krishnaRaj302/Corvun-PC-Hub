import api from "./api";

/**
 * Fetch customer's own submitted reviews directly from the backend.
 * GET /api/reviews/my-reviews/
 * Returns: Array of real user reviews, or empty array if none submitted.
 */
export const getCustomerReviews = async (user) => {
  try {
    const res = await api.get("/reviews/my-reviews/");
    const backendReviews = res.data?.reviews || [];

    if (Array.isArray(backendReviews)) {
      return backendReviews.map((r) => {
        const prod = r.product_details || {};
        return {
          id: r.id,
          productId: r.product,
          categoryBadge: prod.category ? prod.category.toUpperCase() : "HW",
          architecture: `${prod.brand || "CORVUN"} ARCHITECTURE`,
          productName: r.product_name || prod.product_name || "Hardware Component",
          productSubtitle: prod.sku || "",
          productImage: prod.image || "/images/placeholder-hardware.svg",
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          status: r.status,
          isVerifiedOwner: true,
          helpfulVotes: r.helpful_votes || 0,
          rewardsPoints: 50,
          attributes: ["Verified Purchase"],
          recommend: r.rating >= 4,
          images: Array.isArray(r.images) ? r.images : [],
          createdAt: r.created_at,
        };
      });
    }
  } catch (err) {
    console.debug("Corvun Reviews: Backend fetch error or unauthenticated:", err);
  }

  return [];
};

/**
 * Submit / Create a review.
 * Calls backend POST /api/reviews/create/
 */
export const submitReview = async (user, reviewData) => {
  const payload = {
    product: reviewData.productId || 36, // Link to real product in DB
    rating: Number(reviewData.rating) || 5,
    title: reviewData.title,
    comment: reviewData.comment,
    images: reviewData.images || [],
  };

  const res = await api.post("/reviews/create/", payload);
  return res.data;
};

/**
 * Update an existing review.
 * Calls backend PUT /api/reviews/<review_id>/update/
 */
export const updateReview = async (user, reviewId, updateData) => {
  const payload = {
    rating: updateData.rating,
    title: updateData.title,
    comment: updateData.comment,
    images: updateData.images || [],
  };

  const res = await api.put(`/reviews/${reviewId}/update/`, payload);
  return res.data;
};

/**
 * Delete a review permanently.
 * Calls backend DELETE /api/reviews/<review_id>/delete/
 */
export const deleteReview = async (user, reviewId) => {
  const res = await api.delete(`/reviews/${reviewId}/delete/`);
  return res.data;
};
