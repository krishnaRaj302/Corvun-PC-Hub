import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getWishlist, removeFromWishlist } from "../services/cartService";
import { getProductDetail } from "../services/productService";
import { resolveImageUrl } from "../utils/imageUrl";
import "./Wishlist.css";

function Wishlist() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addToCartItem } = useCart();

  // Data states
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // In-flight action tracking (prevent duplicate clicks)
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState(null);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Load wishlist items and hydrate product details asynchronously
  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWishlist();
      const rawItems = Array.isArray(data?.items) ? data.items : [];

      const hydratedItems = await Promise.all(
        rawItems.map(async (item) => {
          if (item.product && typeof item.product === "object") {
            return {
              ...item,
              productDetails: item.product,
            };
          }

          const productId = item.product;
          if (!productId) {
            return {
              ...item,
              productDetails: null,
            };
          }

          try {
            const detailRes = await getProductDetail(productId);
            const productObj = detailRes?.product || detailRes || {};
            return {
              ...item,
              productDetails: productObj,
            };
          } catch (fetchErr) {
            console.warn(`Failed to resolve telemetry for product ${productId}:`, fetchErr);
            return {
              ...item,
              productDetails: {
                id: productId,
                product_name: `Component #${productId}`,
                base_price: "0.00",
                stock: 0,
                brand_name: "CORVUN",
                category_name: "Hardware",
              },
            };
          }
        })
      );

      setWishlistItems(hydratedItems);
    } catch (err) {
      console.error("Wishlist load error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to load wishlist telemetry from repository.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!authLoading && isAuthenticated) {
      getWishlist()
        .then(async (data) => {
          if (!isMounted) return;
          const rawItems = Array.isArray(data?.items) ? data.items : [];

          const hydratedItems = await Promise.all(
            rawItems.map(async (item) => {
              if (item.product && typeof item.product === "object") {
                return {
                  ...item,
                  productDetails: item.product,
                };
              }

              const productId = item.product;
              if (!productId) {
                return {
                  ...item,
                  productDetails: null,
                };
              }

              try {
                const detailRes = await getProductDetail(productId);
                const productObj = detailRes?.product || detailRes || {};
                return {
                  ...item,
                  productDetails: productObj,
                };
              } catch {
                return {
                  ...item,
                  productDetails: {
                    id: productId,
                    product_name: `Component #${productId}`,
                    base_price: "0.00",
                    stock: 0,
                    brand_name: "CORVUN",
                    category_name: "Hardware",
                  },
                };
              }
            })
          );

          if (isMounted) {
            setWishlistItems(hydratedItems);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Wishlist load error:", err);
          const errMsg =
            err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to load wishlist telemetry from repository.";
          setError(errMsg);
          setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuthenticated]);

  // Add a wishlist item to the active shopping cart
  const handleAddToCart = async (wishlistItem) => {
    const product = wishlistItem.productDetails;
    if (!product || !product.id) return;

    if (product.stock === 0) {
      setFeedback({
        type: "error",
        message: `${product.product_name || "Component"} is depleted from stock.`,
      });
      return;
    }

    setActionLoading((prev) => ({ ...prev, [`cart_${wishlistItem.id}`]: true }));

    try {
      const res = await addToCartItem({
        productId: product.id,
        quantity: 1,
      });

      setFeedback({
        type: "success",
        message: res?.message || `${product.product_name} deployed to Cart!`,
      });
    } catch (err) {
      console.error("Add to cart error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to deploy component to shopping cart.";
      setFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cart_${wishlistItem.id}`]: false }));
    }
  };

  // Remove a product from the wishlist
  const handleRemove = async (wishlistItemId, productName) => {
    setActionLoading((prev) => ({ ...prev, [`remove_${wishlistItemId}`]: true }));

    try {
      await removeFromWishlist(wishlistItemId);
      setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistItemId));
      setFeedback({
        type: "success",
        message: productName
          ? `${productName} purged from your wishlist.`
          : "Component removed from wishlist.",
      });
    } catch (err) {
      console.error("Remove from wishlist error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to remove component from wishlist.";
      setFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`remove_${wishlistItemId}`]: false }));
    }
  };

  const isPageLoading = authLoading || (isAuthenticated && loading);

  return (
    <div className="wishlist-page-container">
      {/* Top Protocol Telemetry Banner */}
      <section className="wishlist-top-banner">
        <div className="wishlist-banner-inner">
          <div className="wishlist-header-text">
            <span className="wishlist-node-code">
              // SECURITY_PROTOCOL // USER_STORAGE // WISHLIST_MATRIX
            </span>
            <h1 className="wishlist-main-title">Hardware Wishlist</h1>
            <p className="wishlist-subtitle">
              Monitor prioritized workstation components, track stock availability in real time,
              and deploy verified hardware directly into your build cart.
            </p>
          </div>

          <div className="wishlist-live-count">
            <span className="count-num">
              {isAuthenticated ? wishlistItems.length : 0}
            </span>
            <span className="count-label">COMPONENTS MONITORED</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="wishlist-layout-container">
        {/* Toast / Feedback Notice */}
        {feedback && (
          <div
            className={`wishlist-feedback-banner ${feedback.type}`}
            role="alert"
          >
            <div className="feedback-content">
              {feedback.type === "success" ? (
                <svg
                  className="feedback-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg
                  className="feedback-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              <span className="feedback-text">{feedback.message}</span>
            </div>
            <button
              type="button"
              className="feedback-close-btn"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss feedback"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auth Loading / Initial Fetch Loading */}
        {isPageLoading ? (
          <div className="wishlist-status-box loading-box">
            <div className="corvun-spinner" />
            <span className="loading-label">
              INTERROGATING WISHLIST REPOSITORY...
            </span>
          </div>
        ) : !isAuthenticated ? (
          /* Unauthenticated User State */
          <div className="wishlist-status-box unauth-box">
            <div className="status-icon-frame">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="status-code-badge">// AUTHENTICATION_REQUIRED</span>
            <h2 className="status-title">Access Restricted</h2>
            <p className="status-desc">
              Please sign in with your Corvun profile credentials to synchronize,
              monitor, and manage your personal hardware telemetry wishlist.
            </p>
            <div className="status-action-row">
              <button
                type="button"
                className="corvun-btn-primary"
                onClick={() => navigate("/login")}
              >
                <span>Authenticate User</span>
                <span className="btn-arrow">→</span>
              </button>
              <Link to="/products" className="corvun-btn-secondary">
                <span>Browse Component Catalog</span>
              </Link>
            </div>
          </div>
        ) : error ? (
          /* API Error State */
          <div className="wishlist-status-box error-box">
            <div className="status-icon-frame error">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <span className="status-code-badge">// TELEMETRY_FAILURE</span>
            <h2 className="status-title">Connection Interrupted</h2>
            <p className="status-desc">{error}</p>
            <button
              type="button"
              className="corvun-btn-primary"
              onClick={fetchWishlist}
            >
              <span>Retry Wishlist Telemetry</span>
              <span className="btn-arrow">↺</span>
            </button>
          </div>
        ) : wishlistItems.length === 0 ? (
          /* Empty Wishlist State */
          <div className="wishlist-status-box empty-box">
            <div className="status-icon-frame empty">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="status-code-badge">// REPOSITORY_STANDBY</span>
            <h2 className="status-title">Your Wishlist is Empty</h2>
            <p className="status-desc">
              No hardware components are currently locked in your telemetry matrix.
              Explore the component catalog to configure custom liquid rigs, save
              high-performance parts, and track real-time stock availability.
            </p>
            <Link to="/products" className="corvun-btn-primary">
              <span>Continue Shopping</span>
              <span className="btn-arrow">→</span>
            </Link>
          </div>
        ) : (
          /* Populated Wishlist Grid */
          <div className="wishlist-grid-wrapper">
            <div className="wishlist-actions-bar">
              <span className="matrix-status-tag">
                ACTIVE MONITORING // {wishlistItems.length}{" "}
                {wishlistItems.length === 1 ? "COMPONENT" : "COMPONENTS"}
              </span>

              <Link to="/products" className="continue-shopping-link">
                <span>Browse More Components</span>
                <span className="link-arrow">→</span>
              </Link>
            </div>

            <div className="wishlist-grid">
              {wishlistItems.map((item) => {
                const prod = item.productDetails || {};
                const isOutOfStock = prod.stock === 0;
                const isLowStock =
                  !isOutOfStock &&
                  typeof prod.low_stock_threshold === "number" &&
                  prod.stock <= prod.low_stock_threshold;

                const isAddingCart = Boolean(actionLoading[`cart_${item.id}`]);
                const isRemoving = Boolean(actionLoading[`remove_${item.id}`]);

                const formattedPrice = prod.base_price
                  ? parseFloat(prod.base_price).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })
                  : "0.00";

                return (
                  <article key={item.id} className="wishlist-card">
                    {/* Futuristic Reticle Corners */}
                    <div className="card-reticle-corner-tl" />
                    <div className="card-reticle-corner-br" />

                    {/* Card Header Badge Row */}
                    <div className="card-badge-header">
                      <span className="prod-brand-tag">
                        {prod.brand_name || "CORVUN"}
                      </span>

                      {isOutOfStock ? (
                        <span className="status-badge depleted">DEPLETED</span>
                      ) : isLowStock ? (
                        <span className="status-badge low-stock">
                          LOW STOCK ({prod.stock})
                        </span>
                      ) : (
                        <span className="status-badge in-stock">
                          IN STOCK ({prod.stock || "OK"})
                        </span>
                      )}
                    </div>

                    {/* Product Image Area */}
                    <Link
                      to={`/products/${prod.id}`}
                      className="wishlist-img-box"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      {prod.primary_image ? (
                        <img
                          src={resolveImageUrl(prod.primary_image)}
                          alt={prod.product_name || "Component"}
                          className="wishlist-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="wishlist-img-placeholder">
                          <span>CORVUN_HW</span>
                        </div>
                      )}
                    </Link>

                    {/* Product Details Section */}
                    <div className="wishlist-meta-box">
                      <div className="meta-category-row">
                        <span className="prod-category-tag">
                          {prod.category_name || "Component"}
                        </span>
                        {prod.sku && (
                          <span className="sku-badge">SKU: {prod.sku}</span>
                        )}
                      </div>

                      <h3 className="prod-name-title">
                        <Link
                          to={`/products/${prod.id}`}
                          className="prod-title-link"
                          title={prod.product_name}
                        >
                          {prod.product_name || `Component #${item.product}`}
                        </Link>
                      </h3>

                      {/* Pricing */}
                      <div className="wishlist-price-row">
                        <span className="price-title">UNIT BASE</span>
                        <span className="price-val">₹{formattedPrice}</span>
                      </div>

                      {/* Action Buttons Matrix */}
                      <div className="card-actions-matrix">
                        {/* Add to Cart */}
                        <button
                          type="button"
                          className="action-btn-cart"
                          disabled={isOutOfStock || isAddingCart || isRemoving}
                          onClick={() => handleAddToCart(item)}
                          aria-label={`Add ${prod.product_name || "product"} to cart`}
                        >
                          {isAddingCart ? (
                            <span className="btn-inner-loading">
                              <span className="btn-spinner" />
                              <span>DEPLOYING...</span>
                            </span>
                          ) : isOutOfStock ? (
                            <span>DEPLETED</span>
                          ) : (
                            <span className="btn-inner">
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                              <span>Add to Cart</span>
                            </span>
                          )}
                        </button>

                        {/* View Details Link */}
                        <Link
                          to={`/products/${prod.id}`}
                          className="action-btn-inspect"
                          title="View component technical specifications"
                        >
                          <span>Specs</span>
                          <span className="btn-arrow">→</span>
                        </Link>

                        {/* Remove from Wishlist */}
                        <button
                          type="button"
                          className="action-btn-remove"
                          disabled={isRemoving || isAddingCart}
                          onClick={() => handleRemove(item.id, prod.product_name)}
                          title="Purge component from wishlist"
                          aria-label={`Remove ${prod.product_name || "product"} from wishlist`}
                        >
                          {isRemoving ? (
                            <span className="btn-spinner sm" />
                          ) : (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Wishlist;
