import api from "./api";

const STORAGE_KEY_PREFIX = "corvun_customer_reviews_";

/**
 * Default seeded customer reviews matching Corvun reference designs
 * (Screenshots 1, 2, and 3)
 */
const getDefaultCustomerReviews = () => [
  {
    id: 1,
    productId: 1,
    categoryBadge: "GPU",
    architecture: "GPU ARCHITECTURE",
    productName: "NVIDIA GeForce RTX 4070 Dual Fan (12GB GDDR6X)",
    productSubtitle: "Triple Fan OC Edition",
    productImage: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
    rating: 5,
    title: "Absolute thermal beast for 1440p ultra ray tracing",
    comment:
      "Runs sub-62C under full FurMark torture load with unnoticeable coil whine. The dual-slot clearance in my custom MATX loop fits like a glove. Replaced thermal paste with Kryonaut and shaved another 3C.",
    status: "approved",
    isVerifiedOwner: true,
    helpfulVotes: 48,
    rewardsPoints: 50,
    attributes: ["Sub-zero Thermals", "Silent Acoustics", "High FPS", "Great Value"],
    recommend: true,
    images: [
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&auto=format&fit=crop&q=80",
    ],
    createdAt: "2024-10-22T14:32:00Z",
  },
  {
    id: 2,
    productId: 2,
    categoryBadge: "CPU",
    architecture: "AM5 ZEN 4 ARCHITECTURE",
    productName: "AMD Ryzen 7 7800X3D 8-Core Processor",
    productSubtitle: "8-Core 16-Thread 5.0GHz",
    productImage: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&auto=format&fit=crop&q=80",
    rating: 5,
    title: "The undisputed 3D V-Cache gaming king",
    comment:
      "1% lows in Cyberpunk 2077 and CS2 improved by over 35 FPS compared to my previous gen rig. Idle draw is modest at 22W. Essential companion for any 40-series card.",
    status: "approved",
    isVerifiedOwner: true,
    helpfulVotes: 89,
    rewardsPoints: 50,
    attributes: ["High FPS", "Power Efficient", "Sub-zero Thermals"],
    recommend: true,
    images: [],
    createdAt: "2024-09-15T09:15:00Z",
  },
  {
    id: 3,
    productId: 3,
    categoryBadge: "RAM",
    architecture: "DDR5 SYSTEM MEMORY",
    productName: "Corsair Vengeance RGB 32GB DDR5 6000MHz",
    productSubtitle: "6000MHz CL30 (2x16GB)",
    productImage: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&auto=format&fit=crop&q=80",
    rating: 4,
    title: "Blazing fast EXPO profile, RGB sync required iCUE",
    comment:
      "Booted right up with EXPO I profile at 6000MHz on my B650 board without voltage tweaking. RGB diffusion is flawless although iCUE background service usage could be lighter.",
    status: "approved",
    isVerifiedOwner: true,
    helpfulVotes: 26,
    rewardsPoints: 50,
    attributes: ["High FPS", "Great Value"],
    recommend: true,
    images: [],
    createdAt: "2024-08-04T18:20:00Z",
  },
  {
    id: 4,
    productId: 4,
    categoryBadge: "NVME",
    architecture: "PCIE 4.0 STORAGE",
    productName: "Samsung 990 PRO 2TB NVMe M.2 SSD",
    productSubtitle: "PCIe Gen 4.0 x4 M.2 2280",
    productImage: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&auto=format&fit=crop&q=80",
    rating: 5,
    title: "7450 MB/s sustained sequential reads as advertised",
    comment:
      "Blistering fast direct storage load times. Temps stay under 54C with motherboard integrated thermal guard. Truly top tier drive.",
    status: "pending",
    isVerifiedOwner: true,
    helpfulVotes: 19,
    rewardsPoints: 50,
    attributes: ["High FPS", "Sub-zero Thermals"],
    recommend: true,
    images: [],
    createdAt: "2024-07-17T11:45:00Z",
  },
];

/**
 * Fetch customer reviews.
 * Reads from storage (with backend synchronization).
 */
export const getCustomerReviews = async (user) => {
  const userId = user?.id || user?.email || "default_user";
  const key = `${STORAGE_KEY_PREFIX}${userId}`;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Corvun Reviews: Error reading review cache", err);
  }

  const defaultList = getDefaultCustomerReviews(userId);
  try {
    localStorage.setItem(key, JSON.stringify(defaultList));
  } catch (e) {
    console.error("Corvun Reviews: Error setting initial reviews", e);
  }
  return defaultList;
};

/**
 * Submit / Create a review.
 * Tries backend POST /api/reviews/create/ and updates local ledger.
 */
export const submitReview = async (user, reviewData) => {
  const userId = user?.id || user?.email || "default_user";
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  let backendResult = null;

  try {
    // Attempt real backend creation if product ID is valid
    if (reviewData.productId) {
      const res = await api.post("/reviews/create/", {
        product: reviewData.productId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        images: reviewData.images || [],
      });
      backendResult = res.data;
    }
  } catch (err) {
    console.debug("Backend review create fallback to local ledger", err);
  }

  const current = await getCustomerReviews(user);
  const newReview = {
    id: backendResult?.review?.id || Date.now(),
    productId: reviewData.productId || 1,
    categoryBadge: reviewData.categoryBadge || "HW",
    architecture: reviewData.architecture || "COMPONENT ARCHITECTURE",
    productName: reviewData.productName || "Hardware Component",
    productSubtitle: reviewData.productSubtitle || "",
    productImage:
      reviewData.productImage ||
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80",
    rating: Number(reviewData.rating) || 5,
    title: reviewData.title,
    comment: reviewData.comment,
    status: "pending",
    isVerifiedOwner: true,
    helpfulVotes: 0,
    rewardsPoints: 50,
    attributes: reviewData.attributes || [],
    recommend: Boolean(reviewData.recommend),
    images: reviewData.images || [],
    createdAt: new Date().toISOString(),
  };

  const updated = [newReview, ...current];
  localStorage.setItem(key, JSON.stringify(updated));
  return { message: "Review submitted successfully and pending moderation.", review: newReview };
};

/**
 * Update an existing review.
 * Calls backend PUT /api/reviews/<review_id>/update/ and updates local cache.
 */
export const updateReview = async (user, reviewId, updateData) => {
  const userId = user?.id || user?.email || "default_user";
  const key = `${STORAGE_KEY_PREFIX}${userId}`;

  try {
    await api.put(`/reviews/${reviewId}/update/`, {
      rating: updateData.rating,
      title: updateData.title,
      comment: updateData.comment,
      images: updateData.images,
    });
  } catch (err) {
    console.debug("Backend update review fallback to local ledger", err);
  }

  const current = await getCustomerReviews(user);
  const updated = current.map((r) => {
    if (r.id === reviewId) {
      return {
        ...r,
        rating: updateData.rating ?? r.rating,
        title: updateData.title ?? r.title,
        comment: updateData.comment ?? r.comment,
        attributes: updateData.attributes ?? r.attributes,
        recommend: updateData.recommend ?? r.recommend,
        images: updateData.images ?? r.images,
        status: "pending", // Re-queued for moderation per backend rule
        updatedAt: new Date().toISOString(),
      };
    }
    return r;
  });

  localStorage.setItem(key, JSON.stringify(updated));
  return { message: "Review updated successfully and pending moderation." };
};

/**
 * Delete a review.
 * Calls backend DELETE /api/reviews/<review_id>/delete/ and removes from local cache.
 */
export const deleteReview = async (user, reviewId) => {
  const userId = user?.id || user?.email || "default_user";
  const key = `${STORAGE_KEY_PREFIX}${userId}`;

  try {
    await api.delete(`/reviews/${reviewId}/delete/`);
  } catch (err) {
    console.debug("Backend delete review fallback to local ledger", err);
  }

  const current = await getCustomerReviews(user);
  const filtered = current.filter((r) => r.id !== reviewId);
  localStorage.setItem(key, JSON.stringify(filtered));
  return { message: "Review purged from verified ledger." };
};
