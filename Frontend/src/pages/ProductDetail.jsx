import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProductDetail, getProductReviews, submitProductReview } from "../services/productService";
import { addToWishlist } from "../services/cartService";
import { resolveImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCartItem } = useCart();

  // Core Data States
  const [data, setData] = useState(null);
  const [reviewsData, setReviewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Interactive Selection States
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("specifications");

  // User Action & Notification States
  const [actionFeedback, setActionFeedback] = useState({ type: "", message: "" });
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  // Review Form States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState({ type: "", text: "" });

  // Helpful reviews counter state (local interaction)
  const [helpfulCounts, setHelpfulCounts] = useState({});

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");
        setActionFeedback({ type: "", message: "" });

        const [productRes, reviewRes] = await Promise.all([
          getProductDetail(id),
          getProductReviews(id).catch(() => ({ reviews: [] })),
        ]);

        setData(productRes);
        setReviewsData(reviewRes?.reviews || []);

        // Pre-select first image
        if (productRes.images && productRes.images.length > 0) {
          setSelectedImage(productRes.images[0].image);
        } else if (productRes.product?.primary_image) {
          setSelectedImage(productRes.product.primary_image);
        }

        // Pre-select first variant if present
        if (productRes.variants && productRes.variants.length > 0) {
          setSelectedVariant(productRes.variants[0]);
        }
      } catch (err) {
        console.error("Failed to load product detail:", err);
        setError("Hardware component record not found or server is unreachable.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // Clear feedback message after 4 seconds
  useEffect(() => {
    if (actionFeedback.message) {
      const timer = setTimeout(() => {
        setActionFeedback({ type: "", message: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  if (loading) {
    return (
      <div className="product-detail-page detail-loading-container">
        <div className="detail-spinner" />
        <p className="detail-loading-text">
          INTERROGATING COMPONENT DATABASE #{id}...
        </p>
      </div>
    );
  }

  if (error || !data || !data.product) {
    return (
      <div className="product-detail-page detail-error-container">
        <div className="detail-error-badge">404 // NOT_FOUND</div>
        <h2 className="detail-error-title">Component Not Found</h2>
        <p className="detail-error-subtitle">
          {error || "Unable to retrieve hardware telemetry for this component identifier."}
        </p>
        <Link to="/products" className="detail-error-back-btn">
          ← Return to Hardware Catalog
        </Link>
      </div>
    );
  }

  const { product, variants = [], images = [], specifications = [] } = data;

  const currentPrice = selectedVariant && selectedVariant.price
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.base_price || 0);

  const currentStock = selectedVariant
    ? selectedVariant.stock
    : product.stock;

  const isOutOfStock = currentStock <= 0;
  const isLowStock = !isOutOfStock && currentStock <= (product.low_stock_threshold || 3);

  // Group real specifications logically for Architectural Blueprint
  const specsMap = {};
  specifications.forEach((s) => {
    specsMap[s.specification_name.toLowerCase()] = s.specification_value;
  });

  // Extract key telemetry metrics from real specifications
  const powerSpec =
    specsMap["maximum turbo power"] ||
    specsMap["power"] ||
    specsMap["tgp"] ||
    specsMap["total graphics power"] ||
    specsMap["tdp"] ||
    "253W TURBO";

  const socketSpec =
    specsMap["socket"] ||
    specsMap["interface"] ||
    specsMap["bus interface"] ||
    "LGA1700";

  const coresSpec =
    specsMap["total cores"] ||
    specsMap["cuda cores"] ||
    specsMap["cores"] ||
    "20 CORES";

  const architectureSpec =
    specsMap["architecture"] ||
    specsMap["generation"] ||
    product.brand_name ||
    "RAPTOR LAKE";

  // Logical groups for Blueprint
  const group1Specs = specifications.filter((s) => {
    const n = s.specification_name.toLowerCase();
    return (
      n.includes("arch") ||
      n.includes("gen") ||
      n.includes("core") ||
      n.includes("thread") ||
      n.includes("process")
    );
  });

  const group2Specs = specifications.filter((s) => {
    const n = s.specification_name.toLowerCase();
    return (
      n.includes("clock") ||
      n.includes("speed") ||
      n.includes("cache") ||
      n.includes("frequency") ||
      n.includes("boost")
    );
  });

  const group3Specs = specifications.filter((s) => {
    const n = s.specification_name.toLowerCase();
    return (
      n.includes("power") ||
      n.includes("thermal") ||
      n.includes("socket") ||
      n.includes("cooler") ||
      n.includes("watt")
    );
  });

  const group4Specs = specifications.filter((s) => {
    const n = s.specification_name.toLowerCase();
    return (
      n.includes("graphic") ||
      n.includes("display") ||
      n.includes("hdmi") ||
      n.includes("pcie") ||
      n.includes("i/o")
    );
  });

  // If no categorization matched, show all specs in group 1
  const hasCategorizedGroups =
    group1Specs.length > 0 ||
    group2Specs.length > 0 ||
    group3Specs.length > 0 ||
    group4Specs.length > 0;

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    setIsAddingToCart(true);
    setActionFeedback({ type: "", message: "" });

    try {
      if (!isAuthenticated) {
        setActionFeedback({
          type: "warning",
          message: "Please log in to add items to your rig workstation cart.",
        });
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      await addToCartItem({
        productId: product.id,
        variantId: selectedVariant ? selectedVariant.id : null,
        quantity,
      });

      setActionFeedback({
        type: "success",
        message: `✓ Added ${quantity} × ${product.product_name} to your workstation rig!`,
      });
    } catch (err) {
      console.error("Cart addition error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to add component to cart.";
      setActionFeedback({ type: "error", message: errMsg });
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle Buy Now
  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    if (!isAuthenticated) {
      setActionFeedback({
        type: "warning",
        message: "Please log in to proceed directly with purchase.",
      });
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    try {
      setIsAddingToCart(true);
      await addToCartItem({
        productId: product.id,
        variantId: selectedVariant ? selectedVariant.id : null,
        quantity,
      });
      navigate("/cart");
    } catch (err) {
      console.error("Buy now error:", err);
      const errMsg =
        err.response?.data?.error || "Failed to initialize fast purchase.";
      setActionFeedback({ type: "error", message: errMsg });
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle Wishlist
  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      setActionFeedback({
        type: "warning",
        message: "Please log in to save components to your wishlist.",
      });
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    setIsWishlisting(true);
    try {
      const res = await addToWishlist(product.id);
      setInWishlist(true);
      setActionFeedback({
        type: "success",
        message: res.message || "Component locked into personal telemetry wishlist!",
      });
    } catch (err) {
      console.error("Wishlist error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to update wishlist.";
      setActionFeedback({ type: "error", message: errMsg });
    } finally {
      setIsWishlisting(false);
    }
  };

  // Handle Review Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setReviewMessage({
        type: "error",
        text: "Authentication required. Please log in to submit verified telemetry.",
      });
      return;
    }

    setSubmittingReview(true);
    setReviewMessage({ type: "", text: "" });

    try {
      const payload = {
        product: product.id,
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      };

      await submitProductReview(payload);
      setReviewMessage({
        type: "success",
        text: "Review submitted successfully and is pending verification.",
      });
      setReviewTitle("");
      setReviewComment("");
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewMessage({ type: "", text: "" });
      }, 2500);
    } catch (err) {
      console.error("Review submission error:", err);
      const errText =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Could not submit review at this time.";
      setReviewMessage({ type: "error", text: errText });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Calculate review statistics
  const reviewCount = reviewsData.length;
  const avgRating =
    reviewCount > 0
      ? (
          reviewsData.reduce((acc, curr) => acc + (curr.rating || 5), 0) /
          reviewCount
        ).toFixed(1)
      : "5.0";

  // Rating distribution counts
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviewsData.forEach((r) => {
    const star = Math.min(Math.max(r.rating || 5, 1), 5);
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
  });

  return (
    <div className="product-detail-page">
      {/* 1. TOP BREADCRUMB & TELEMETRY STRIP */}
      <div className="corvun-detail-breadcrumb-bar">
        <div className="breadcrumb-path">
          <Link to="/" className="bc-link">
            <svg
              className="bc-home-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </Link>
          <span className="bc-sep">/</span>
          <Link
            to={`/products?category=${encodeURIComponent(product.category_name || "")}`}
            className="bc-link"
          >
            {product.category_name || "Hardware Components"}
          </Link>
          <span className="bc-sep">/</span>
          <span className="bc-current">{product.product_name}</span>
        </div>

        <div className="breadcrumb-telemetry-badge">
          <span className="badge-telemetry-dot" />
          <span className="badge-telemetry-label">
            SYSTEM CHASSIS {product.brand_name?.toUpperCase() || "CORVUN"} REF
          </span>
          <span className="badge-telemetry-sku">SKU: {product.sku || "N/A"}</span>
        </div>
      </div>

      {/* ACTION FEEDBACK ALERT */}
      {actionFeedback.message && (
        <div className={`detail-alert-banner alert-${actionFeedback.type}`}>
          <span className="alert-icon">
            {actionFeedback.type === "success" ? "✓" : "!"}
          </span>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* 2. PRODUCT OVERVIEW SECTION (55% LEFT / 45% RIGHT) */}
      <section className="detail-overview-grid">
        {/* LEFT COLUMN: PRODUCT IMAGE GALLERY */}
        <div className="detail-gallery-column">
          <div className="detail-main-viewport">
            {selectedImage ? (
              <img
                src={resolveImageUrl(selectedImage)}
                alt={product.product_name}
                className="detail-large-image"
              />
            ) : (
              <div className="detail-no-image-placeholder">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#384052"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>CORVUN_HARDWARE_PREVIEW</span>
              </div>
            )}

            {/* Bottom-left Pill Overlay */}
            <div className="detail-chassis-pill">
              <span className="pill-pulse-dot" />
              <span>
                {socketSpec ? `${socketSpec} DIE-CAST ARCHITECTURE` : "HIGH-OCTANE ARCHITECTURE"}
              </span>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {images && images.length > 0 && (
            <div className="detail-thumbnail-strip">
              {images.map((img, idx) => {
                const isActive =
                  selectedImage === img.image ||
                  (!selectedImage && idx === 0);

                const label = img.image_type
                  ? img.image_type.replace(/_/g, " ").toUpperCase()
                  : `VIEW 0${idx + 1}`;

                return (
                  <button
                    key={img.id || idx}
                    type="button"
                    className={`detail-thumb-card ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedImage(img.image)}
                  >
                    <div className="thumb-img-wrapper">
                      <img
                        src={resolveImageUrl(img.image)}
                        alt={label}
                        className="thumb-img"
                      />
                    </div>
                    <span className="thumb-tag">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PRODUCT INFORMATION & PURCHASE PANEL */}
        <div className="detail-info-column">
          {/* Header Badges */}
          <div className="detail-meta-tags">
            <span className="meta-tag brand-tag">
              {product.brand_name || "CORVUN"} / {product.category_name?.toUpperCase() || "COMPONENT"}
            </span>
            <span className="meta-tag tech-tag">
              {architectureSpec}
            </span>
          </div>

          {/* Product Name */}
          <h1 className="detail-product-name">{product.product_name}</h1>

          {/* Short Specs / Subtitle */}
          <div className="detail-specs-subtitle">
            {product.description
              ? product.description.split("\n")[0]
              : `${coresSpec} | ${socketSpec} | ${powerSpec} | Engineered for Workstations`}
          </div>

          {/* Rating Summary Row */}
          <div className="detail-rating-row">
            <div className="stars-cluster">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`star-icon ${i < Math.round(Number(avgRating)) ? "filled" : ""}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="rating-score">{avgRating}</span>
            <span className="reviews-count-label">
              ({reviewCount > 0 ? `${reviewCount} reviews` : "Verified Telemetry"})
            </span>
            <span className="rating-bullet">•</span>
            <div className="questions-label">
              <span className="question-mark-box">?</span>
              <span>14 answered questions</span>
            </div>
          </div>

          {/* PRICE & PURCHASE PANEL */}
          <div className="detail-purchase-panel">
            <div className="price-primary-row">
              <span className="currency-symbol">₹</span>
              <span className="price-numeric">
                {Number(currentPrice).toLocaleString("en-IN")}
              </span>
            </div>

            <p className="price-tax-note">
              Inclusive of all taxes. EMI starts at ₹
              {Math.max(1, Math.round(currentPrice / 24)).toLocaleString("en-IN")}
              /mo with no-cost bank options.
            </p>

            {/* Real Stock Status */}
            <div className="detail-stock-row">
              <span
                className={`stock-status-dot ${
                  isOutOfStock ? "out" : isLowStock ? "low" : "in"
                }`}
              />
              <span className="stock-status-text">
                {isOutOfStock
                  ? "Out of Stock (Currently unavailable)"
                  : isLowStock
                  ? `Low Stock (Only ${currentStock} units remaining in Mumbai warehouse)`
                  : `In Stock (${currentStock} units ready in Mumbai warehouse)`}
              </span>
            </div>

            {/* Hardware Editions / Variants */}
            {variants && variants.length > 0 && (
              <div className="detail-variants-group">
                <span className="variants-heading">Hardware Editions & Variants</span>
                <div className="variants-chips-row">
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className={`variant-chip ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedVariant(v)}
                      >
                        <span className="variant-name">
                          {v.variant_name || "Standard Edition"}
                        </span>
                        {v.price && (
                          <span className="variant-cost">
                            ₹{Number(v.price).toLocaleString("en-IN")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Wishlist */}
            <div className="detail-qty-wishlist-row">
              <div className="detail-qty-controller">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                >
                  −
                </button>
                <span className="qty-number">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    setQuantity((prev) => Math.min(currentStock || 1, prev + 1))
                  }
                  disabled={quantity >= currentStock || isOutOfStock}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={`detail-wishlist-btn ${inWishlist ? "active" : ""}`}
                onClick={handleAddToWishlist}
                disabled={isWishlisting}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={inWishlist ? "#ef3842" : "none"}
                  stroke={inWishlist ? "#ef3842" : "currentColor"}
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{inWishlist ? "In Wishlist" : "Add to Wishlist"}</span>
              </button>
            </div>

            {/* Primary Action Buttons */}
            <div className="detail-action-buttons">
              <button
                type="button"
                className="btn-add-to-cart"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAddingToCart}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span>
                  {isOutOfStock
                    ? "COMPONENT DEPLETED"
                    : isAddingToCart
                    ? "ADDING TO RIG..."
                    : "Add to Cart"}
                </span>
              </button>

              <button
                type="button"
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={isOutOfStock || isAddingToCart}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Buy Now</span>
              </button>
            </div>
          </div>

          {/* SERVICE BENEFITS (4 CARDS 2x2 GRID) */}
          <div className="detail-benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef3842"
                  strokeWidth="2"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="benefit-body">
                <h4 className="benefit-title">Free Fast Logistics</h4>
                <p className="benefit-desc">Dispatch under 24 hrs. 2–3 day transit.</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef3842"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="benefit-body">
                <h4 className="benefit-title">3 Years Warranty</h4>
                <p className="benefit-desc">
                  Official {product.brand_name || "brand"} RMA & on-site swap.
                </p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef3842"
                  strokeWidth="2"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </div>
              <div className="benefit-body">
                <h4 className="benefit-title">7-Day Hassle Return</h4>
                <p className="benefit-desc">Instant replacement for hardware flaw.</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef3842"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="benefit-body">
                <h4 className="benefit-title">Verified Authentic</h4>
                <p className="benefit-desc">Cryptographic anti-counterfeit tag.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THERMAL & POWER ENVELOPE TELEMETRY BAR (SCREENSHOT 2) */}
      <div className="detail-telemetry-banner">
        <div className="telemetry-banner-left">
          <div className="telemetry-badge-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef3842"
              strokeWidth="2"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          </div>
          <div className="telemetry-banner-text">
            <span className="telemetry-main-title">THERMAL & POWER ENVELOPE</span>
            <span className="telemetry-sub-title">
              Target load profile calculated at maximum boost clock
            </span>
          </div>
        </div>

        <div className="telemetry-banner-right">
          <div className="telemetry-metric-pill">
            <span className="metric-tag">DRAW:</span>
            <span className="metric-val">{powerSpec}</span>
          </div>
          <div className="telemetry-metric-pill">
            <span className="metric-tag">HEADROOM:</span>
            <span className="metric-val">650W PSU REC</span>
          </div>
          <div className="telemetry-metric-pill">
            <span className="metric-tag">TEMPS:</span>
            <span className="metric-val">&lt;68°C PEAK</span>
          </div>
        </div>
      </div>

      {/* 4. TAB NAVIGATION */}
      <nav className="detail-tabs-navbar">
        <button
          type="button"
          className={`detail-tab-pill ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={`detail-tab-pill ${activeTab === "specifications" ? "active" : ""}`}
          onClick={() => setActiveTab("specifications")}
        >
          Specifications
        </button>
        <button
          type="button"
          className={`detail-tab-pill ${activeTab === "compatibility" ? "active" : ""}`}
          onClick={() => setActiveTab("compatibility")}
        >
          Compatibility
        </button>
        <button
          type="button"
          className={`detail-tab-pill ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          Reviews {reviewCount > 0 && <span className="tab-counter">{reviewCount}</span>}
        </button>
        <button
          type="button"
          className={`detail-tab-pill ${activeTab === "faqs" ? "active" : ""}`}
          onClick={() => setActiveTab("faqs")}
        >
          FAQs
        </button>
      </nav>

      {/* 5. TAB CONTENT PANELS */}
      <div className="detail-tab-content-area">
        {/* SPECIFICATIONS TAB (SCREENSHOT 2) */}
        {activeTab === "specifications" && (
          <div className="specifications-split-grid">
            {/* Left 65%: Architectural Blueprint */}
            <div className="blueprint-column">
              <div className="blueprint-card">
                <div className="blueprint-header">
                  <div className="blueprint-title-row">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef3842"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span className="blueprint-title">Architectural Blueprint</span>
                  </div>
                  <span className="blueprint-rev-badge">VERIFIED REVISION A1</span>
                </div>

                {/* Specification Sections */}
                {specifications.length === 0 ? (
                  <div className="empty-specs-box">
                    <p>No specifications have been logged for this component SKU.</p>
                  </div>
                ) : hasCategorizedGroups ? (
                  <div className="blueprint-sections-list">
                    {/* Section 01: Core Architecture */}
                    {group1Specs.length > 0 && (
                      <div className="blueprint-group">
                        <div className="group-header">
                          <span className="group-tag">01 // COMPONENT ARCHITECTURE & ENGINE</span>
                          <span className="group-subtag">TSMC / INTEL SILICON MATRIX</span>
                        </div>
                        <div className="group-specs-grid">
                          {group1Specs.map((s) => (
                            <div key={s.id} className="spec-row-item">
                              <span className="spec-key">{s.specification_name}</span>
                              <span className="spec-val">{s.specification_value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 02: Frequency & Performance */}
                    {group2Specs.length > 0 && (
                      <div className="blueprint-group">
                        <div className="group-header">
                          <span className="group-tag">02 // FREQUENCY, CACHE & PERFORMANCE MATRIX</span>
                          <span className="group-subtag">HIGH-SPEED BUS INTERCONNECT</span>
                        </div>
                        <div className="group-specs-grid">
                          {group2Specs.map((s) => (
                            <div key={s.id} className="spec-row-item">
                              <span className="spec-key">{s.specification_name}</span>
                              <span className="spec-val">{s.specification_value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 03: Power & Thermals */}
                    {group3Specs.length > 0 && (
                      <div className="blueprint-group">
                        <div className="group-header">
                          <span className="group-tag">03 // POWER, THERMALS & SOCKET SPECIFICATIONS</span>
                          <span className="group-subtag">THERMAL DESIGN ENVELOPE</span>
                        </div>
                        <div className="group-specs-grid">
                          {group3Specs.map((s) => (
                            <div key={s.id} className="spec-row-item">
                              <span className="spec-key">{s.specification_name}</span>
                              <span className="spec-val">{s.specification_value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 04: Graphics & I/O */}
                    {group4Specs.length > 0 && (
                      <div className="blueprint-group">
                        <div className="group-header">
                          <span className="group-tag">04 // INTEGRATED GRAPHICS & EXPANSION I/O</span>
                          <span className="group-subtag">DISPLAY & DATA PIPELINE</span>
                        </div>
                        <div className="group-specs-grid">
                          {group4Specs.map((s) => (
                            <div key={s.id} className="spec-row-item">
                              <span className="spec-key">{s.specification_name}</span>
                              <span className="spec-val">{s.specification_value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="blueprint-group">
                    <div className="group-header">
                      <span className="group-tag">01 // HARDWARE ARCHITECTURE SPECIFICATIONS</span>
                      <span className="group-subtag">FACTORY CALIBRATED METRICS</span>
                    </div>
                    <div className="group-specs-grid">
                      {specifications.map((s) => (
                        <div key={s.id} className="spec-row-item">
                          <span className="spec-key">{s.specification_name}</span>
                          <span className="spec-val">{s.specification_value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 35%: Physical Metrics & Unboxing Manifest */}
            <div className="metrics-column">
              {/* Dimensions Card */}
              <div className="metrics-card">
                <span className="metrics-section-tag">PHYSICAL METRICS</span>
                <h3 className="metrics-title">Dimensions & Clearance</h3>

                <div className="metrics-list">
                  <div className="metric-line">
                    <span className="metric-label">Socket / Package</span>
                    <span className="metric-data">{socketSpec}</span>
                  </div>
                  <div className="metric-line">
                    <span className="metric-label">Lithography</span>
                    <span className="metric-data">Intel 7 (10nm Enhanced SuperFin)</span>
                  </div>
                  <div className="metric-line">
                    <span className="metric-label">Max Turbo Power</span>
                    <span className="metric-data">{powerSpec}</span>
                  </div>
                  <div className="metric-line">
                    <span className="metric-label">Form Factor Clearance</span>
                    <span className="metric-data">Standard ATX / Mini-ITX</span>
                  </div>
                </div>

                <div className="case-fit-box">
                  <div className="case-fit-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef3842"
                      strokeWidth="2"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </div>
                  <div className="case-fit-body">
                    <span className="case-fit-title">Case Fit Guaranteed</span>
                    <p className="case-fit-desc">
                      Compatible with 98% of standard Mid-Tower ATX and liquid-cooled workstation enclosures.
                    </p>
                  </div>
                </div>
              </div>

              {/* Package Contents Manifest */}
              <div className="manifest-card">
                <span className="manifest-tag">UNBOXING MANIFEST</span>
                <h3 className="manifest-title">Package Contents</h3>

                <ul className="manifest-items-list">
                  <li>
                    <span className="manifest-check">✓</span>
                    <span>{product.product_name} Processing Unit</span>
                  </li>
                  <li>
                    <span className="manifest-check">✓</span>
                    <span>
                      {specsMap["cooler included"]?.toLowerCase() === "yes"
                        ? "OEM High-Performance Heatsink Cooler"
                        : "Thermal Guidance & Installation Manual"}
                    </span>
                  </li>
                  <li>
                    <span className="manifest-check">✓</span>
                    <span>Corvun Factory Authentication Holographic Certificate</span>
                  </li>
                  <li>
                    <span className="manifest-check">✓</span>
                    <span>3-Year Warranty & RMA Quickstart Information</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="overview-tab-panel">
            <h3 className="overview-heading">Component Architecture & Design Overview</h3>
            <p className="overview-body-text">
              {product.description ||
                `${product.product_name} is engineered for ruthless clock speeds, zero thermal throttling, and uncompromising power users. Designed specifically for demanding workloads such as high-frame-rate 4K esports gaming, complex 3D rendering pipelines, and deep multi-threaded computational workflows.`}
            </p>

            <div className="overview-highlights-row">
              <div className="highlight-pill-card">
                <span className="highlight-num">{coresSpec}</span>
                <span className="highlight-sub">Total Hybrid Compute Cores</span>
              </div>
              <div className="highlight-pill-card">
                <span className="highlight-num">{powerSpec}</span>
                <span className="highlight-sub">Peak Thermal Design Envelope</span>
              </div>
              <div className="highlight-pill-card">
                <span className="highlight-num">{socketSpec}</span>
                <span className="highlight-sub">Interconnect Socket Form Factor</span>
              </div>
            </div>
          </div>
        )}

        {/* COMPATIBILITY TAB */}
        {activeTab === "compatibility" && (
          <div className="compatibility-tab-panel">
            <h3 className="compat-heading">Verified Platform Compatibility</h3>
            <div className="compat-grid">
              <div className="compat-item-box">
                <span className="compat-label">Motherboard Socket</span>
                <span className="compat-value">{socketSpec}</span>
                <p className="compat-note">
                  Verified compatible with Intel 600 and 700 Series chipset motherboards (Z790, B760, Z690).
                </p>
              </div>

              <div className="compat-item-box">
                <span className="compat-label">Memory Architecture</span>
                <span className="compat-value">DDR5 & DDR4 Support</span>
                <p className="compat-note">
                  Dual-channel DDR5-5600 MT/s and DDR4-3200 MT/s memory architectures verified.
                </p>
              </div>

              <div className="compat-item-box">
                <span className="compat-label">PCIe Bus Support</span>
                <span className="compat-value">PCIe 5.0 & 4.0</span>
                <p className="compat-note">
                  Up to 20 PCIe lanes for direct high-speed NVMe storage and discrete GPU lanes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FAQS TAB */}
        {activeTab === "faqs" && (
          <div className="faqs-tab-panel">
            <h3 className="faqs-heading">Frequently Asked Inquiries</h3>
            <div className="faqs-list">
              <div className="faq-card">
                <h4 className="faq-q">Does this component come with an included cooler?</h4>
                <p className="faq-a">
                  {specsMap["cooler included"]?.toLowerCase() === "yes"
                    ? "Yes, an official heatsink/fan cooler is bundled in this retail SKU package."
                    : "No, high-performance unlocked processors require an aftermarket 240mm+ liquid AIO or high-grade dual-tower air cooler for optimal boost thermals."}
                </p>
              </div>

              <div className="faq-card">
                <h4 className="faq-q">Is this hardware compatible with liquid cooling loops?</h4>
                <p className="faq-a">
                  Yes, standard IHS heatspreaders and PCB clearance match all standard custom liquid blocks and AIO brackets.
                </p>
              </div>

              <div className="faq-card">
                <h4 className="faq-q">How does Corvun verify brand authenticity?</h4>
                <p className="faq-a">
                  Every product shipped features direct brand manufacturer seals, verifiable serial telemetry, and cryptographic anti-counterfeit QR stamps.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. REVIEWS SECTION (SCREENSHOT 3) */}
      <section className="detail-reviews-section" id="reviews-section">
        <div className="reviews-section-header">
          <div className="reviews-header-badge">
            <span className="header-badge-dot" />
            <span>VERIFIED TELEMETRY FROM PILOTS</span>
          </div>
          <h2 className="reviews-section-title">Customer Reviews & Field Reports</h2>
          <p className="reviews-section-subtitle">
            Authentic user performance feedback under real thermal and gaming stress.
          </p>
        </div>

        <div className="reviews-split-grid">
          {/* Left Column: Overall Rating Card */}
          <div className="reviews-summary-card">
            <div className="summary-score-row">
              <span className="large-score">{avgRating}</span>
              <div className="score-stars-col">
                <div className="summary-stars">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`star-icon ${
                        i < Math.round(Number(avgRating)) ? "filled" : ""
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="verified-buyers-badge">
                  {reviewCount > 0 ? `${reviewCount} Verified Buyers` : "0 Verified Buyers"}
                </span>
              </div>
            </div>
            <span className="out-of-five">out of 5.0 rating</span>

            {/* Star Distribution Progress Bars */}
            <div className="rating-distribution-list">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star] || 0;
                const pct =
                  reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;

                return (
                  <div key={star} className="distribution-bar-row">
                    <span className="bar-star-label">{star}★</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="bar-pct-label">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* Write a Review Button */}
            <button
              type="button"
              className="btn-write-review"
              onClick={() => {
                if (!isAuthenticated) {
                  setActionFeedback({
                    type: "warning",
                    message: "Please log in to submit a verified field review.",
                  });
                  setTimeout(() => navigate("/login"), 1500);
                  return;
                }
                setShowReviewModal(true);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Write a Review</span>
            </button>
          </div>

          {/* Right Column: Review Cards List */}
          <div className="reviews-cards-column">
            {reviewsData.length === 0 ? (
              <div className="reviews-empty-box">
                <div className="empty-reviews-icon">
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2e3546"
                    strokeWidth="1.5"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="empty-reviews-title">No reviews yet.</h3>
                <p className="empty-reviews-desc">
                  Be the first pilot to submit telemetry and hardware feedback for this component.
                </p>
                <button
                  type="button"
                  className="btn-first-review"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setActionFeedback({
                        type: "warning",
                        message: "Please log in to submit a verified field review.",
                      });
                      setTimeout(() => navigate("/login"), 1500);
                      return;
                    }
                    setShowReviewModal(true);
                  }}
                >
                  Submit First Review
                </button>
              </div>
            ) : (
              <div className="reviews-list">
                {reviewsData.map((rev) => {
                  const initialName = rev.user_name || "Anonymous Pilot";
                  const initials = initialName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const formattedDate = rev.created_at
                    ? new Date(rev.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Verified Pilot";

                  const helpfulVal =
                    (rev.helpful_votes || 0) + (helpfulCounts[rev.id] || 0);

                  return (
                    <div key={rev.id} className="review-item-card">
                      <div className="review-card-header">
                        <div className="reviewer-info-left">
                          <div className="reviewer-avatar">{initials}</div>
                          <div className="reviewer-meta-text">
                            <div className="reviewer-name-row">
                              <span className="reviewer-name">{initialName}</span>
                              <span className="verified-badge">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="#ef3842"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                Verified Buyer
                              </span>
                            </div>
                            <span className="review-timestamp">
                              Reviewed on {formattedDate}
                            </span>
                          </div>
                        </div>

                        <div className="review-stars-right">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`star-icon ${
                                i < (rev.rating || 5) ? "filled" : ""
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      {rev.title && (
                        <h4 className="review-headline">"{rev.title}"</h4>
                      )}

                      <p className="review-comment-body">"{rev.comment}"</p>

                      <div className="review-card-footer">
                        <div className="review-feedback-buttons">
                          <button
                            type="button"
                            className="btn-helpful"
                            onClick={() => {
                              setHelpfulCounts((prev) => ({
                                ...prev,
                                [rev.id]: (prev[rev.id] || 0) + 1,
                              }));
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                            </svg>
                            <span>Helpful ({helpfulVal})</span>
                          </button>

                          <button
                            type="button"
                            className="btn-reply"
                            onClick={() => {
                              setActionFeedback({
                                type: "info",
                                message: "Community thread discussion opens soon.",
                              });
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="9 14 4 9 9 4" />
                              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                            </svg>
                            <span>Reply</span>
                          </button>
                        </div>

                        <span className="review-system-spec">
                          System: {product.brand_name || "Workstation"} / {socketSpec}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WRITE A REVIEW MODAL */}
      {showReviewModal && (
        <div className="corvun-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div
            className="corvun-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Submit Hardware Telemetry</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowReviewModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="modal-form">
              {reviewMessage.text && (
                <div
                  className={`modal-alert ${
                    reviewMessage.type === "success" ? "alert-success" : "alert-error"
                  }`}
                >
                  {reviewMessage.text}
                </div>
              )}

              <div className="form-field">
                <label className="field-label">Overall Component Rating</label>
                <div className="interactive-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-select-btn ${
                        star <= reviewRating ? "active" : ""
                      }`}
                      onClick={() => setReviewRating(star)}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-num-label">{reviewRating} / 5 Stars</span>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Headline / Short Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unbelievable clock speeds and stable thermal envelope"
                  className="modal-input"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Detailed Field Report</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Describe temperatures under load, framerate consistency, fan acoustics, and build experience..."
                  className="modal-textarea"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={submittingReview}
                >
                  {submittingReview ? "Transmitting..." : "Submit Verified Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
