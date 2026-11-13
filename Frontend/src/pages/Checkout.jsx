import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getCart } from "../services/cartService";
import { getProductDetail } from "../services/productService";
import {
  getAddresses,
  addAddress,
  createOrder,
  createPayment,
} from "../services/orderService";
import { resolveImageUrl } from "../utils/imageUrl";
import "./Checkout.css";

function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { fetchCart } = useCart();

  // Cart & Address states
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cod");

  // Loading & Error states
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Address form modal/expand state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    full_name: "",
    phone: "",
    alternative_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false,
  });

  // Auto-dismiss feedback message
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Hydrate checkout parameters on mount
  useEffect(() => {
    let isMounted = true;

    if (!authLoading && isAuthenticated) {
      Promise.all([getCart(), getAddresses()])
        .then(async ([cartRes, addrRes]) => {
          if (!isMounted) return;
          const rawCartItems = Array.isArray(cartRes?.items) ? cartRes.items : [];
          const fetchedAddresses = Array.isArray(addrRes?.addresses) ? addrRes.addresses : [];

          const hydratedCart = await Promise.all(
            rawCartItems.map(async (item) => {
              const productId = typeof item.product === "object" ? item.product?.id : item.product;
              if (!productId) return { ...item, productData: null, variantData: null };

              try {
                const detailRes = await getProductDetail(productId);
                const product = detailRes?.product || detailRes || {};
                const variants = Array.isArray(detailRes?.variants) ? detailRes.variants : [];
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
                  },
                  variantData: null,
                };
              }
            })
          );

          if (isMounted) {
            setCartItems(hydratedCart);
            setAddresses(fetchedAddresses);
            if (fetchedAddresses.length > 0) {
              const defaultAddr = fetchedAddresses.find((a) => a.is_default);
              setSelectedAddressId(defaultAddr ? defaultAddr.id : fetchedAddresses[0].id);
            }
            setPageLoading(false);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Checkout data load error:", err);
          const errMsg =
            err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to load checkout parameters.";
          setFeedback({ type: "error", message: errMsg });
          setPageLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuthenticated]);

  // Handle new address form input
  const handleAddressInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit new address
  const handleSaveAddress = async (e) => {
    e.preventDefault();

    if (!addressForm.full_name.trim() || !addressForm.phone.trim() || !addressForm.address_line1.trim()) {
      setFeedback({
        type: "error",
        message: "Full name, phone, and address line 1 are strictly required.",
      });
      return;
    }

    setIsSavingAddress(true);
    try {
      const payload = {
        ...addressForm,
        user: user?.id,
      };

      const res = await addAddress(payload);
      const createdAddr = res?.address;

      if (createdAddr) {
        setAddresses((prev) => [createdAddr, ...prev]);
        setSelectedAddressId(createdAddr.id);
      }

      setShowAddressForm(false);
      setAddressForm({
        label: "Home",
        full_name: "",
        phone: "",
        alternative_phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
        is_default: false,
      });

      setFeedback({
        type: "success",
        message: "Delivery destination registered and selected.",
      });
    } catch (err) {
      console.error("Address save error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to register delivery address.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Calculate frontend estimated subtotal for display
  const estimatedSubtotal = cartItems.reduce((acc, item) => {
    const price =
      item.variantData && item.variantData.price != null
        ? parseFloat(item.variantData.price)
        : item.productData?.base_price != null
        ? parseFloat(item.productData.base_price)
        : 0;
    return acc + price * item.quantity;
  }, 0);

  // Place Order submission
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setFeedback({
        type: "error",
        message: "Please select or register a verified delivery address.",
      });
      return;
    }

    if (cartItems.length === 0) {
      setFeedback({
        type: "error",
        message: "Your shopping cart is currently unpopulated.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // 1. Submit order to backend (backend validates stock, prices & addresses authoritatively)
      const orderRes = await createOrder({
        shippingAddressId: selectedAddressId,
      });

      const createdOrder = orderRes?.order;
      if (!createdOrder?.id) {
        throw new Error("Invalid order telemetry returned from gateway.");
      }

      // 2. Create payment record for the created order
      let paymentRes = null;
      try {
        paymentRes = await createPayment({
          orderId: createdOrder.id,
          paymentMethod: selectedPaymentMethod,
        });
      } catch (payErr) {
        console.warn("Payment record notice:", payErr);
      }

      // 3. Refresh cart state (backend cleared items) and navigate
      await fetchCart();

      navigate(`/order-confirmation?order_id=${createdOrder.id}`, {
        state: {
          order: createdOrder,
          orderId: createdOrder.id,
          payment: paymentRes?.payment || null,
          paymentMethod: selectedPaymentMethod,
        },
      });
    } catch (err) {
      console.error("Order creation error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Order deployment failed. Please check stock or address details and retry.";
      setFeedback({ type: "error", message: errMsg });
      setIsSubmitting(false);
    }
  };

  const isScreenLoading = authLoading || (isAuthenticated && pageLoading);

  return (
    <div className="checkout-page-container">
      {/* Top Telemetry Banner */}
      <section className="checkout-top-banner">
        <div className="checkout-banner-inner">
          <div className="checkout-header-text">
            <span className="checkout-node-code">
              // PROTOCOL_DEPLOY // SECURE_TRANSACTION // DISPATCH_GATEWAY
            </span>
            <h1 className="checkout-main-title">Hardware Checkout</h1>
            <p className="checkout-subtitle">
              Verify your physical deployment terminal, inspect your workstation components,
              and authorize the component matrix dispatch.
            </p>
          </div>

          <div className="checkout-telemetry-badge">
            <span className="telemetry-label">SECURITY ENCRYPTION</span>
            <span className="telemetry-val">TLS 1.3 // 256-BIT</span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="checkout-layout-container">
        {/* Feedback Alert Toast */}
        {feedback && (
          <div className={`checkout-feedback-banner ${feedback.type}`} role="alert">
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

        {/* Loading State */}
        {isScreenLoading ? (
          <div className="checkout-status-box loading-box">
            <div className="corvun-spinner" />
            <span className="loading-label">INTERROGATING DISPATCH TELEMETRY...</span>
          </div>
        ) : !isAuthenticated ? (
          /* Unauthenticated State */
          <div className="checkout-status-box unauth-box">
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
            <h2 className="status-title">Clearance Required</h2>
            <p className="status-desc">
              Please authenticate with your Corvun profile credentials to access secure checkout
              and authorize equipment delivery.
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
        ) : cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="checkout-status-box empty-box">
            <div className="status-icon-frame empty">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <span className="status-code-badge">// CART_UNPOPULATED</span>
            <h2 className="status-title">Your Cart is Empty</h2>
            <p className="status-desc">
              There are no hardware components queued for checkout. Deploy components from the
              catalog or your wishlist to proceed with order dispatch.
            </p>
            <div className="status-action-row">
              <Link to="/products" className="corvun-btn-primary">
                <span>Explore Catalog</span>
                <span className="btn-arrow">→</span>
              </Link>
              <Link to="/wishlist" className="corvun-btn-secondary">
                <span>View Wishlist Matrix</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Checkout 2-Column Grid Layout */
          <div className="checkout-split-grid">
            {/* Left Column: Address Selection & Payment Methods */}
            <div className="checkout-main-column">
              {/* SECTION A: DELIVERY ADDRESS */}
              <section className="checkout-panel">
                <div className="panel-reticle-tl" />
                <div className="panel-reticle-br" />

                <div className="panel-header-row">
                  <div className="panel-title-group">
                    <span className="panel-step-num">STEP 01</span>
                    <h2 className="panel-title">Delivery Destination</h2>
                  </div>

                  {!showAddressForm && (
                    <button
                      type="button"
                      className="add-address-toggle-btn"
                      onClick={() => setShowAddressForm(true)}
                    >
                      <span>+ New Destination</span>
                    </button>
                  )}
                </div>

                {/* Add New Address Form */}
                {showAddressForm && (
                  <form onSubmit={handleSaveAddress} className="address-creation-form">
                    <div className="form-header-row">
                      <span className="form-title">// REGISTER NEW DISPATCH ADDRESS</span>
                      <button
                        type="button"
                        className="form-close-btn"
                        onClick={() => setShowAddressForm(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="form-grid-row">
                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-label">
                          DESTINATION TAG
                        </label>
                        <input
                          id="addr-label"
                          type="text"
                          name="label"
                          className="field-input"
                          placeholder="e.g. Home, R&D Lab, Office"
                          value={addressForm.label}
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-fullname">
                          RECIPIENT NAME
                        </label>
                        <input
                          id="addr-fullname"
                          type="text"
                          name="full_name"
                          className="field-input"
                          placeholder="Full legal recipient name"
                          value={addressForm.full_name}
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-row">
                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-phone">
                          COMMUNICATION PHONE
                        </label>
                        <input
                          id="addr-phone"
                          type="tel"
                          name="phone"
                          className="field-input"
                          placeholder="e.g. 9876543210"
                          value={addressForm.phone}
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-altphone">
                          SECONDARY CONTACT (OPTIONAL)
                        </label>
                        <input
                          id="addr-altphone"
                          type="tel"
                          name="alternative_phone"
                          className="field-input"
                          placeholder="Alternative phone"
                          value={addressForm.alternative_phone}
                          onChange={handleAddressInputChange}
                        />
                      </div>
                    </div>

                    <div className="form-field full-width">
                      <label className="field-label" htmlFor="addr-line1">
                        ADDRESS LINE 1 (STREET / BUILDING / SUITE)
                      </label>
                      <input
                        id="addr-line1"
                        type="text"
                        name="address_line1"
                        className="field-input"
                        placeholder="Plot / Flat / Street address"
                        value={addressForm.address_line1}
                        onChange={handleAddressInputChange}
                        required
                      />
                    </div>

                    <div className="form-field full-width">
                      <label className="field-label" htmlFor="addr-line2">
                        ADDRESS LINE 2 (LANDMARK / LOCALITY)
                      </label>
                      <input
                        id="addr-line2"
                        type="text"
                        name="address_line2"
                        className="field-input"
                        placeholder="Landmark, apartment complex, sector"
                        value={addressForm.address_line2}
                        onChange={handleAddressInputChange}
                      />
                    </div>

                    <div className="form-grid-three">
                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-city">
                          CITY
                        </label>
                        <input
                          id="addr-city"
                          type="text"
                          name="city"
                          className="field-input"
                          placeholder="City"
                          value={addressForm.city}
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-state">
                          STATE
                        </label>
                        <input
                          id="addr-state"
                          type="text"
                          name="state"
                          className="field-input"
                          placeholder="State"
                          value={addressForm.state}
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label" htmlFor="addr-postal">
                          POSTAL CODE
                        </label>
                        <input
                          id="addr-postal"
                          type="text"
                          name="postal_code"
                          className="field-input"
                          placeholder="e.g. 560001"
                          value={addressForm.postal_code}
                          onChange={handleAddressInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-field checkbox-field">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={addressForm.is_default}
                          onChange={handleAddressInputChange}
                          className="corvun-checkbox"
                        />
                        <span>Set as primary default destination</span>
                      </label>
                    </div>

                    <div className="form-actions-row">
                      <button
                        type="submit"
                        className="corvun-btn-primary"
                        disabled={isSavingAddress}
                      >
                        {isSavingAddress ? (
                          <span className="btn-spinner-box">
                            <span className="btn-spinner" />
                            <span>SAVING DESTINATION...</span>
                          </span>
                        ) : (
                          <span>Register Address</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className="corvun-btn-secondary"
                        onClick={() => setShowAddressForm(false)}
                        disabled={isSavingAddress}
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Saved Addresses Cards */}
                {addresses.length === 0 ? (
                  <div className="no-address-notice">
                    <span className="notice-icon">!</span>
                    <div className="notice-text">
                      <strong>No delivery destination registered.</strong>
                      <p>
                        Please add a delivery address to enable hardware dispatch validation.
                      </p>
                    </div>
                    {!showAddressForm && (
                      <button
                        type="button"
                        className="corvun-btn-primary sm"
                        onClick={() => setShowAddressForm(true)}
                      >
                        <span>+ Add Address</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="addresses-cards-grid">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;

                      return (
                        <div
                          key={addr.id}
                          className={`address-card ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedAddressId(addr.id)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedAddressId(addr.id);
                            }
                          }}
                        >
                          <div className="card-selection-indicator">
                            <span className={`custom-radio-dot ${isSelected ? "active" : ""}`} />
                          </div>

                          <div className="address-card-body">
                            <div className="address-tag-row">
                              <span className="address-label-badge">{addr.label || "Home"}</span>
                              {addr.is_default && (
                                <span className="default-badge">DEFAULT</span>
                              )}
                            </div>

                            <h3 className="recipient-name">{addr.full_name}</h3>
                            <p className="address-lines">
                              {addr.address_line1}
                              {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                            </p>
                            <p className="city-state-line">
                              {addr.city}, {addr.state} - {addr.postal_code}
                            </p>
                            <span className="contact-phone">PHONE: {addr.phone}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SECTION C: PAYMENT METHOD */}
              <section className="checkout-panel">
                <div className="panel-reticle-tl" />
                <div className="panel-reticle-br" />

                <div className="panel-header-row">
                  <div className="panel-title-group">
                    <span className="panel-step-num">STEP 02</span>
                    <h2 className="panel-title">Authorized Payment Gateway</h2>
                  </div>
                </div>

                <div className="payment-methods-grid">
                  {/* Cash On Delivery (COD) */}
                  <label
                    className={`payment-method-tile ${
                      selectedPaymentMethod === "cod" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={selectedPaymentMethod === "cod"}
                      onChange={() => setSelectedPaymentMethod("cod")}
                      className="payment-radio-input"
                    />
                    <div className="payment-tile-content">
                      <div className="payment-tile-header">
                        <span className="payment-title">Cash on Delivery (COD)</span>
                        <span className="payment-badge">RECOMMENDED</span>
                      </div>
                      <p className="payment-desc">
                        Inspect hardware upon doorstep delivery. Settle balance via cash, UPI or card
                        directly with our verified logistics agent.
                      </p>
                    </div>
                  </label>

                  {/* Razorpay Online */}
                  <label
                    className={`payment-method-tile ${
                      selectedPaymentMethod === "razorpay" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="razorpay"
                      checked={selectedPaymentMethod === "razorpay"}
                      onChange={() => setSelectedPaymentMethod("razorpay")}
                      className="payment-radio-input"
                    />
                    <div className="payment-tile-content">
                      <div className="payment-tile-header">
                        <span className="payment-title">Razorpay Online Gateway</span>
                        <span className="payment-badge-secure">ENCRYPTED</span>
                      </div>
                      <p className="payment-desc">
                        Pay securely with UPI, Net Banking, Credit/Debit Cards, or EMI via the
                        authoritative Razorpay gateway.
                      </p>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Order Summary & Place Order */}
            <div className="checkout-sidebar-column">
              <aside className="checkout-summary-panel">
                <div className="panel-reticle-tl" />
                <div className="panel-reticle-br" />

                <div className="summary-header">
                  <span className="summary-tag">// DISPATCH_MANIFEST</span>
                  <h2 className="summary-title">Order Manifest</h2>
                  <span className="summary-item-count">
                    {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Units Queued
                  </span>
                </div>

                {/* Items List */}
                <div className="summary-items-list">
                  {cartItems.map((item) => {
                    const prod = item.productData || {};
                    const variant = item.variantData;
                    const unitPrice =
                      variant && variant.price != null
                        ? parseFloat(variant.price)
                        : prod.base_price != null
                        ? parseFloat(prod.base_price)
                        : 0;
                    const itemSubtotal = unitPrice * item.quantity;

                    return (
                      <div key={item.id} className="summary-item-card">
                        <div className="item-thumb-box">
                          {prod.primary_image ? (
                            <img
                              src={resolveImageUrl(prod.primary_image)}
                              alt={prod.product_name || "Component"}
                              className="item-thumb-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="item-thumb-placeholder">
                              <span>HW</span>
                            </div>
                          )}
                        </div>

                        <div className="item-info-box">
                          <span className="item-brand-tag">
                            {prod.brand_name || "CORVUN"}
                          </span>
                          <h4 className="item-name" title={prod.product_name}>
                            {prod.product_name || `Component #${item.product}`}
                          </h4>

                          {variant?.variant_name && (
                            <span className="item-variant-tag">
                              CONFIG: {variant.variant_name}
                            </span>
                          )}

                          <div className="item-qty-price-row">
                            <span className="item-qty">QTY: {item.quantity}</span>
                            <span className="item-subtotal">
                              ₹
                              {itemSubtotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown */}
                <div className="summary-pricing-matrix">
                  <div className="pricing-row">
                    <span className="pricing-label">SUBTOTAL</span>
                    <span className="pricing-val">
                      ₹
                      {estimatedSubtotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="pricing-row">
                    <span className="pricing-label">EXPEDITED DISPATCH</span>
                    <span className="pricing-val free">FREE (PROMO)</span>
                  </div>

                  <div className="pricing-row">
                    <span className="pricing-label">TAXES & DUTIES</span>
                    <span className="pricing-val">INCLUDED</span>
                  </div>

                  <div className="pricing-divider" />

                  <div className="pricing-total-row">
                    <div className="total-title-box">
                      <span className="total-label">TOTAL AUTHORIZED</span>
                      <span className="backend-disclaimer">
                        *Backend authoritative validation
                      </span>
                    </div>
                    <span className="total-val">
                      ₹
                      {estimatedSubtotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* SECTION D: PLACE ORDER BUTTON */}
                <div className="place-order-action-box">
                  <button
                    type="button"
                    className="corvun-place-order-btn"
                    disabled={isSubmitting || cartItems.length === 0 || !selectedAddressId}
                    onClick={handlePlaceOrder}
                  >
                    {isSubmitting ? (
                      <span className="btn-loading-inner">
                        <span className="btn-spinner" />
                        <span>TRANSMITTING ORDER TELEMETRY...</span>
                      </span>
                    ) : (
                      <span className="btn-active-inner">
                        <span>Deploy Workstation Order</span>
                        <span className="btn-arrow">→</span>
                      </span>
                    )}
                  </button>

                  {!selectedAddressId && addresses.length > 0 && (
                    <span className="validation-warning-hint">
                      Select a destination above to authorize dispatch.
                    </span>
                  )}

                  <p className="guarantee-note">
                    By placing this order, you authorize Corvun fulfillment to reserve inventory
                    and begin configuration of your hardware matrix.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checkout;
