import api from "./api";

/**
 * Default curated exclusive deals matching CORVUN PC design specification
 */
export const DEFAULT_DEALS = [
  {
    id: "deal-gpu-pack",
    title: "Flagship GPU Power Pack",
    category: "gpu",
    badge: "FEATURED DEAL",
    discount: "20% OFF",
    discountValue: 20,
    description:
      "Get up to 20% off high-performance RTX 40-series cards with complimentary GPU anti-sag bracket.",
    expiresInDays: 3,
    code: "CORVUNGPU20",
    buttonText: "Claim Deal",
    imageUrl: "/images/deals/gpu-deal.svg",
    targetRoute: "/products?category=gpu",
  },
  {
    id: "deal-ryzen-combo",
    title: "Ryzen + Motherboard Combo",
    category: "processors",
    badge: "HOT BUNDLE",
    discount: "30% OFF",
    discountValue: 30,
    description:
      "Save big on AMD Ryzen 7 7800X3D paired with MSI B650M Gaming WiFi motherboards.",
    expiresInDays: 5,
    code: "ZENCOMBO",
    buttonText: "Shop Now",
    imageUrl: "/images/deals/combo-deal.svg",
    targetRoute: "/products?category=processors",
  },
  {
    id: "deal-ddr5-surge",
    title: "DDR5 High-Speed Memory Surge",
    category: "ram",
    badge: null,
    discount: "15% OFF",
    discountValue: 15,
    description:
      "Special pricing on 6000MHz CL30 EXPO/XMP dual-channel memory kits.",
    expiresInDays: 7,
    code: "DDR5SPEED",
    buttonText: "Shop Now",
    imageUrl: "/images/deals/ram-deal.svg",
    targetRoute: "/products?category=memory",
  },
  {
    id: "deal-nvme-blaze",
    title: "Gen4 NVMe Blazing Storage Sale",
    category: "storage",
    badge: null,
    discount: "25% OFF",
    discountValue: 25,
    description:
      "Blistering 7,450 MB/s sustained PCIe 4.0 read speeds at unbeatable per-gigabyte prices.",
    expiresInDays: 2,
    code: "SSDFAST",
    buttonText: "Shop Now",
    imageUrl: "/images/deals/nvme-deal.svg",
    targetRoute: "/products?category=storage",
  },
  {
    id: "deal-psu-clearance",
    title: "Enthusiast Gold PSU Clearance",
    category: "psu",
    badge: null,
    discount: "18% OFF",
    discountValue: 18,
    description:
      "80 PLUS Gold certified 850W/1000W modular power supplies with braided cable kits.",
    expiresInDays: 4,
    code: "POWERTOWER",
    buttonText: "Shop Now",
    imageUrl: "/images/deals/psu-deal.svg",
    targetRoute: "/products?category=power",
  },
  {
    id: "deal-cooler-bonanza",
    title: "Thermal Cooling & Airflow Bonanza",
    category: "cooling",
    badge: null,
    discount: "35% OFF",
    discountValue: 35,
    description:
      "Dual-tower performance heatsinks, high-static pressure fans, and premium thermal pastes.",
    expiresInDays: 2,
    code: "COOLRUN",
    buttonText: "Shop Now",
    imageUrl: "/images/deals/cooler-deal.svg",
    targetRoute: "/products?category=cooling",
  },
];

/**
 * Fetch deals from backend promotions if available, or return curated defaults
 */
export const getActiveDeals = async () => {
  try {
    const response = await api.get("/promotions/offers/");
    const backendOffers = response.data?.offers;

    if (Array.isArray(backendOffers) && backendOffers.length > 0) {
      // Merge or map backend offers
      return backendOffers.map((offer, index) => {
        const fallback = DEFAULT_DEALS[index % DEFAULT_DEALS.length];
        return {
          id: `offer-${offer.id}`,
          title: offer.title || fallback.title,
          category: offer.category_name?.toLowerCase() || fallback.category,
          badge: offer.apply_for ? offer.apply_for.toUpperCase() : fallback.badge,
          discount: `${parseFloat(offer.discount_value)}% OFF`,
          discountValue: parseFloat(offer.discount_value),
          description: offer.title ? `Special limited allocation offer on ${offer.title}.` : fallback.description,
          expiresInDays: fallback.expiresInDays,
          code: fallback.code,
          buttonText: "Shop Now",
          imageUrl: fallback.imageUrl,
          targetRoute: fallback.targetRoute,
        };
      });
    }
  } catch (err) {
    console.debug("Backend promotions returned empty, using curated deals:", err);
  }

  return DEFAULT_DEALS;
};
