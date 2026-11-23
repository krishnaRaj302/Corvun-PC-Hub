import api from "./api";

/**
 * Fetch active promotional offers directly from the backend API.
 * GET /api/promotions/offers/
 * Returns: Array of active offers, or empty array if none exist in the database.
 */
export const getActiveDeals = async () => {
  try {
    const response = await api.get("/promotions/offers/");
    const backendOffers = response.data?.offers;

    if (Array.isArray(backendOffers) && backendOffers.length > 0) {
      return backendOffers.map((offer) => {
        const expiresInDays = offer.valid_until
          ? Math.max(1, Math.ceil((new Date(offer.valid_until) - new Date()) / (1000 * 60 * 60 * 24)))
          : 7;

        return {
          id: `offer-${offer.id}`,
          title: offer.title || "Special Hardware Offer",
          category: offer.category_name?.toLowerCase() || "hardware",
          badge: offer.apply_for ? offer.apply_for.toUpperCase() : "EXCLUSIVE DEAL",
          discount: `${parseFloat(offer.discount_value || 0)}% OFF`,
          discountValue: parseFloat(offer.discount_value || 0),
          description: offer.title
            ? `Special limited allocation discount on ${offer.title}.`
            : "Exclusive limited-time promotional discount on verified components.",
          expiresInDays,
          code: offer.code || "CORVUN",
          buttonText: "Shop Now",
          imageUrl: "/images/deals/gpu-deal.svg",
          targetRoute: "/products",
        };
      });
    }
  } catch (err) {
    console.debug("Backend promotions query:", err);
  }

  return [];
};
