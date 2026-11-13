import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { addToWishlist } from "../services/cartService";
import { getProductDetail } from "../services/productService";
import { resolveImageUrl } from "../utils/imageUrl";
import "./Cart.css";

function Cart() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const {
    cartItems,
    cartLoading,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  // Hydrated item details (productData, variantData)
  const [hydratedItems, setHydratedItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(true);

  // Per-item action loading (prevents duplicate rapid clicks)
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState(null);

  // Promo voucher code state
  const [promoCode, setPromoCode] = useState("CORVUNBUILD");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Auto-dismiss feedback message
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Hydrate cart items with full product and variant information
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      if (!isAuthenticated || cartItems.length === 0) {
        if (isMounted) {
          setHydratedItems([]);
          setDetailsLoading(false);
        }
        return;
      }

      setDetailsLoading(true);
      try {
        const enriched = await Promise.all(
          cartItems.map(async (item) => {
            const productId =
              typeof item.product === "object" ? item.product?.id : item.product;

            if (!productId) {
              return { ...item, productData: null, variantData: null };
            }

            try {
              const res = await getProductDetail(productId);
              const product = res?.product || res || {};
              const variants = Array.isArray(res?.variants) ? res.variants : [];
              const variantObj = item.variant
                ? variants.find((v) => v.id === item.variant) || null
                : null;

              return {
                ...item,
                productData: product,
                variantData: variantObj,
              };
            } catch {
              return {
                ...item,
                productData: {
                  id: productId,
                  product_name: `Component #${productId}`,
                  base_price: "0.00",
                  stock: 0,
                  description: "Standard Corvun hardware module",
                },
                variantData: null,
              };
            }
          })
        );

        if (isMounted) {
          setHydratedItems(enriched);
        }
      } catch (err) {
        console.error("Cart hydration failure:", err);
      } finally {
        if (isMounted) {
          setDetailsLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [cartItems, isAuthenticated]);

  // Calculations
  const { subtotal, totalItemCount } = useMemo(() => {
    let sum = 0;
    let count = 0;

    hydratedItems.forEach((item) => {
      const price = item.variantData?.price
        ? parseFloat(item.variantData.price)
        : parseFloat(item.productData?.base_price || 0);

      const qty = item.quantity || 1;
      sum += price * qty;
      count += qty;
    });

    return { subtotal: sum, totalItemCount: count };
  }, [hydratedItems]);

  const estimatedGST = subtotal * 0.18;
  const totalAmount = Math.max(0, subtotal - promoDiscount);

  // Handle Quantity Increase
  const handleIncrease = async (item) => {
    const availableStock = item.variantData
      ? item.variantData.stock
      : item.productData?.stock || 0;

    if (item.quantity >= availableStock) {
      setFeedback({
        type: "warning",
        message: `Maximum available inventory allocation reached (${availableStock} units).`,
      });
      return;
    }

    setActionLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      await updateQuantity(item.id, item.quantity + 1);
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Failed to update item quantity.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setActionLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Handle Quantity Decrease
  const handleDecrease = async (item) => {
    if (item.quantity <= 1) return;

    setActionLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      await updateQuantity(item.id, item.quantity - 1);
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Failed to update item quantity.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setActionLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Handle Remove Item
  const handleRemove = async (item) => {
    setActionLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      await removeItem(item.id);
      setFeedback({
        type: "success",
        message: `Component decommissioned from active cart.`,
      });
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Failed to remove component from cart.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setActionLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Handle Save For Later (Move to Wishlist)
  const handleSaveForLater = async (item) => {
    const prodId = item.productData?.id;
    if (!prodId) return;

    setActionLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      await addToWishlist(prodId);
      await removeItem(item.id);
      setFeedback({
        type: "success",
        message: `Reallocated ${item.productData.product_name} to your Wishlist archive.`,
      });
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Failed to move component to wishlist.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setActionLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Handle Clear Cart
  const handleClearCart = async () => {
    if (hydratedItems.length === 0) return;
    if (!window.confirm("Purge all indexed hardware components from your active cart?")) {
      return;
    }

    setActionLoading((prev) => ({ ...prev, clear: true }));
    try {
      await clearCart();
      setFeedback({
        type: "info",
        message: "Workstation cart inventory purged.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to purge cart payload.",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, clear: false }));
    }
  };

  // Apply Voucher Code
  const handleApplyVoucher = (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    if (promoCode.trim().toUpperCase() === "CORVUNBUILD") {
      const discount = subtotal * 0.05;
      setPromoDiscount(discount);
      setPromoApplied(true);
      setFeedback({
        type: "success",
        message: `Voucher authenticated: 5% Hardware Rebate applied (-₹${discount.toLocaleString(
          "en-IN",
          { minimumFractionDigits: 2 }
        )})`,
      });
    } else {
      setFeedback({
        type: "error",
        message: "Voucher key invalid or unrecognized by promotional registry.",
      });
    }
  };

  // Handle Quick Pairing Add
  const handleAddPairing = async (name) => {
    setFeedback({
      type: "info",
      message: `${name} pairing reservation noted. Add from Components catalog for direct allocation.`,
    });
  };

  // 1. Unauthenticated View
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-empty-container">
          <div className="cart-empty-card">
            <span className="card-corner corner-top-left" />
            <span className="card-corner corner-top-right" />
            <span className="card-corner corner-bottom-left" />
            <span className="card-corner corner-bottom-right" />

            <div className="empty-icon-box">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <span className="empty-badge">AUTHENTICATION_REQUIRED</span>
            <h2 className="empty-title">ACCESS DENIED // GUEST SESSION</h2>
            <p className="empty-subtitle">
              Sign in to your verified Corvun account to initialize your hardware cart, inspect component compatibility, and deploy hardware builds.
            </p>

            <Link to="/login" className="cart-primary-action-btn">
              AUTHENTICATE TERMINAL →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  const isInitialLoading = authLoading || (cartLoading && hydratedItems.length === 0 && detailsLoading);

  if (isInitialLoading) {
    return (
      <div className="cart-page-wrapper cart-loading-view">
        <div className="corvun-spinner" />
        <p className="cart-loading-text">INTERROGATING ACTIVE WORKSTATION CART TELEMETRY...</p>
      </div>
    );
  }

  // 3. Empty Cart State (Matches Image 2 exactly)
  if (hydratedItems.length === 0) {
    return (
      <div className="cart-page-wrapper">
        {/* Breadcrumb */}
        <div className="cart-breadcrumb-bar">
          <span className="breadcrumb-path">
            <Link to="/">HOME</Link> / <span className="active-path">CART</span>
          </span>
        </div>

        <div className="cart-empty-header-block">
          <span className="protocol-code">■ INVENTORY ALLOCATION // CHECKOUT QUEUE</span>
          <h1 className="cart-headline">Your Cart</h1>
        </div>

        <div className="cart-empty-container">
          <div className="cart-empty-card">
            <span className="card-corner corner-top-left" />
            <span className="card-corner corner-top-right" />
            <span className="card-corner corner-bottom-left" />
            <span className="card-corner corner-bottom-right" />

            <div className="empty-icon-box">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <span className="empty-badge">● NULL_PAYLOAD_DETECTED</span>
            <h2 className="empty-title">YOUR CART IS EMPTY</h2>
            <p className="empty-subtitle">
              Looks like you haven't added anything to your cart yet. Browse our high-performance components or configure your custom rig.
            </p>

            <Link to="/products" className="cart-primary-action-btn">
              CONTINUE SHOPPING →
            </Link>
          </div>

          <div className="empty-telemetry-footer">
            <span>[ SYS_STATUS: NULL_INVENTORY ]</span>
            <span>•</span>
            <span>SHA-256 INTEGRITY VERIFIED</span>
            <span>//</span>
            <span>ALLOCATION_STATE: READY</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Populated Cart State (Matches Image 1 exactly)
  return (
    <div className="cart-page-wrapper">
      {/* Toast Notification */}
      {feedback && (
        <div className={`cart-toast-alert alert-${feedback.type}`}>
          <span className="toast-dot" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="cart-breadcrumb-bar">
        <span className="breadcrumb-path">
          <Link to="/">HOME</Link> / <span className="active-path">CART</span>
        </span>
      </div>

      {/* Top Header Row */}
      <div className="cart-header-row">
        <div className="cart-title-group">
          <h1 className="cart-headline">Your Cart</h1>
          <span className="cart-count-pill">{totalItemCount} items</span>
        </div>

        <button
          type="button"
          className="cart-clear-btn"
          disabled={actionLoading.clear}
          onClick={handleClearCart}
        >
          {actionLoading.clear ? (
            "PURGING..."
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              CLEAR CART →
            </>
          )}
        </button>
      </div>

      {/* Component Compatibility Banner */}
      <div className="cart-compatibility-banner">
        <div className="comp-banner-left">
          <div className="comp-check-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div className="comp-banner-text">
            <h4>Component Compatibility Checked</h4>
            <p>Selected PCIe 4.0 storage & AM5 hardware configuration are 100% matched.</p>
          </div>
        </div>

        <span className="comp-wattage-badge">DRAW: 485W EST.</span>
      </div>

      {/* Two-Column Grid */}
      <div className="cart-main-grid">
        {/* Left Column: Items List & Extras */}
        <div className="cart-items-column">
          <div className="cart-items-list">
            {hydratedItems.map((item) => {
              const product = item.productData || {};
              const variant = item.variantData;
              const unitPrice = variant?.price
                ? parseFloat(variant.price)
                : parseFloat(product.base_price || 0);

              const lineTotal = unitPrice * item.quantity;
              const availableStock = variant ? variant.stock : product.stock || 0;
              const isDepleted = availableStock === 0;
              const isActionBusy = Boolean(actionLoading[item.id]);

              // Spec tag text
              const specsLine = variant?.variant_name
                ? `${variant.variant_name} • In Stock`
                : `${product.brand_name || "CORVUN"} | ${product.category_name || "Hardware"} • ${
                    isDepleted ? "Depleted" : "In Stock"
                  }`;

              return (
                <div key={item.id} className="cart-item-card">
                  <span className="card-corner corner-top-left" />
                  <span className="card-corner corner-bottom-right" />

                  {/* Thumbnail */}
                  <div className="item-thumbnail-box">
                    {product.primary_image ? (
                      <img
                        src={resolveImageUrl(product.primary_image)}
                        alt={product.product_name}
                        className="item-img"
                      />
                    ) : (
                      <div className="item-img-placeholder">HW</div>
                    )}
                    {product.category_name && (
                      <span className="item-thumb-tag">{product.category_name.slice(0, 4).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="item-details-box">
                    <span className="item-meta-tags">{specsLine}</span>
                    <Link to={`/products/${product.id}`} className="item-title-link">
                      <h3 className="item-title">{product.product_name}</h3>
                    </Link>
                    <p className="item-desc">
                      {product.description || "High-performance precision workstation component."}
                    </p>

                    <div className="item-actions-row">
                      <button
                        type="button"
                        className="item-action-link"
                        disabled={isActionBusy}
                        onClick={() => handleSaveForLater(item)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        Save for Later
                      </button>

                      <button
                        type="button"
                        className="item-action-link remove-link"
                        disabled={isActionBusy}
                        onClick={() => handleRemove(item)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Pricing & Stepper */}
                  <div className="item-pricing-stepper-box">
                    <div className="item-pricing-meta">
                      <span className="item-line-total">
                        ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="item-unit-price">
                        ₹{unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / unit
                      </span>
                    </div>

                    <div className="item-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={item.quantity <= 1 || isActionBusy}
                        onClick={() => handleDecrease(item)}
                      >
                        −
                      </button>
                      <span className="stepper-val">{item.quantity}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={item.quantity >= availableStock || isActionBusy}
                        onClick={() => handleIncrease(item)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Promotional Voucher Card */}
          <div className="cart-voucher-card">
            <div className="voucher-card-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span>Promotional Voucher & Hardware Rebates</span>
            </div>

            <form onSubmit={handleApplyVoucher} className="voucher-input-row">
              <input
                type="text"
                className="voucher-input"
                placeholder="ENTER COUPON CODE"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button type="submit" className="voucher-apply-btn">
                APPLY CODE
              </button>
            </form>

            <p className="voucher-hint">
              Use code <strong>CORVUNBUILD</strong> for 5% off on multi-part computational builds.
            </p>
          </div>

          {/* Suggested Pairings Section */}
          <div className="cart-suggested-section">
            <div className="suggested-header-row">
              <span className="suggested-tag">■ SUGGESTED FOR THIS BUILD</span>
              <span className="suggested-subtag">Engineered Pairings</span>
            </div>

            <div className="suggested-grid">
              <div className="suggested-card">
                <div className="sugg-img-box">
                  <div className="sugg-placeholder">TG</div>
                </div>
                <div className="sugg-info">
                  <span className="sugg-title">Thermal Grizzly Kryonaut</span>
                  <span className="sugg-price">₹899</span>
                </div>
                <button
                  type="button"
                  className="sugg-add-btn"
                  onClick={() => handleAddPairing("Thermal Grizzly Kryonaut", 899)}
                >
                  + Add
                </button>
              </div>

              <div className="suggested-card">
                <div className="sugg-img-box">
                  <div className="sugg-placeholder">PSU</div>
                </div>
                <div className="sugg-info">
                  <span className="sugg-title">Braided PSU Cables (Crimson)</span>
                  <span className="sugg-price">₹2,499</span>
                </div>
                <button
                  type="button"
                  className="sugg-add-btn"
                  onClick={() => handleAddPairing("Braided PSU Cables", 2499)}
                >
                  + Add
                </button>
              </div>

              <div className="suggested-card">
                <div className="sugg-img-box">
                  <div className="sugg-placeholder">GPU</div>
                </div>
                <div className="sugg-info">
                  <span className="sugg-title">GPU Anti-Sag Milled Bracket</span>
                  <span className="sugg-price">₹1,199</span>
                </div>
                <button
                  type="button"
                  className="sugg-add-btn"
                  onClick={() => handleAddPairing("GPU Anti-Sag Bracket", 1199)}
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <aside className="cart-summary-column">
          <div className="cart-summary-card">
            <span className="card-corner corner-top-left" />
            <span className="card-corner corner-bottom-right" />

            <div className="summary-card-header">
              <h2 className="summary-title">Order Summary</h2>
              <span className="verified-badge">VERIFIED</span>
            </div>

            <div className="summary-calc-rows">
              <div className="calc-row">
                <span className="calc-label">Subtotal ({totalItemCount} items)</span>
                <span className="calc-val">
                  ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {promoApplied && (
                <div className="calc-row discount-row">
                  <span className="calc-label">Voucher Discount (5%)</span>
                  <span className="calc-val discount-val">
                    −₹{promoDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="calc-row">
                <span className="calc-label">Standard Express Shipping 🛫</span>
                <span className="calc-val free-val">FREE (India)</span>
              </div>

              <div className="calc-row">
                <span className="calc-label">Estimated GST (18% included)</span>
                <span className="calc-val">
                  ₹{estimatedGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-total-row">
              <div className="total-label-box">
                <span className="total-headline">Total Amount</span>
                <span className="total-subtext">Tax invoice inclusive</span>
              </div>
              <span className="total-amount-val">
                ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              className="summary-checkout-btn"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout ↓
            </button>

            <Link to="/products" className="summary-continue-link">
              ⇦ Continue Shopping
            </Link>

            {/* Security Guarantee Stack */}
            <div className="security-badges-stack">
              <div className="sec-badge-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div className="sec-text">
                  <h5>256-Bit SSL Encrypted Checkout</h5>
                  <p>PCI-DSS compliant bank-grade encrypted payment channels.</p>
                </div>
              </div>

              <div className="sec-badge-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <div className="sec-text">
                  <h5>100% Genuine Hardware</h5>
                  <p>Direct serialized OEM manufacturer warranty included.</p>
                </div>
              </div>

              <div className="sec-badge-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <div className="sec-text">
                  <h5>Insured Express Fragile Packing</h5>
                  <p>Custom wooden reinforced crate protection for critical circuits.</p>
                </div>
              </div>
            </div>

            {/* Estimated Delivery Block */}
            <div className="estimated-delivery-box">
              <div className="est-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <div>
                  <span className="est-label">Estimated Delivery</span>
                  <span className="est-time">Expected in 48-72 Hours</span>
                </div>
              </div>
              <span className="air-priority-tag">AIR PRIORITY</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Cart;
