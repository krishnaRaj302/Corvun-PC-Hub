import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOrderDetail, cancelOrder } from "../services/orderService";
import { resolveImageUrl } from "../utils/imageUrl";
import "./OrderDetails.css";

function OrderDetails() {
  const { orderId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Modal / Action states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto-dismiss feedback toast
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Fetch Order Details
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError("No valid order identifier specified.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await getOrderDetail(orderId);
      const data = res?.order || res;
      if (data && (data.id || data.order_number)) {
        setOrder(data);
      } else {
        setError("Order record could not be retrieved from repository.");
      }
    } catch (err) {
      console.error("Order load error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Order not found or permission denied.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let isMounted = true;

    if (!authLoading && isAuthenticated) {
      getOrderDetail(orderId)
        .then((res) => {
          if (!isMounted) return;
          const data = res?.order || res;
          if (data && (data.id || data.order_number)) {
            setOrder(data);
            setError("");
          } else {
            setError("Order record could not be retrieved from repository.");
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Order load error:", err);
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.detail ||
            "Order not found or permission denied.";
          setError(msg);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else if (!authLoading && !isAuthenticated) {
      Promise.resolve().then(() => {
        if (isMounted) setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [orderId, authLoading, isAuthenticated]);

  // Cancel Order Handler
  const handleConfirmCancel = async () => {
    if (!order) return;
    setIsCancelling(true);

    try {
      const res = await cancelOrder(order.id);
      const updatedOrder = res?.order;
      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        setOrder((prev) => ({ ...prev, status: "cancelled" }));
      }
      setShowCancelModal(false);
      setFeedback({
        type: "success",
        message: "Order successfully cancelled and hardware allocation released.",
      });
    } catch (err) {
      console.error("Cancellation failed:", err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Cancellation rejected: only pending orders can be cancelled.";
      setFeedback({ type: "error", message: errMsg });
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  // Trigger Print / Invoice View
  const handleDownloadInvoice = () => {
    window.print();
  };

  // Helper date format
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Helper Hardware Type Tag (GPU, CPU, SSD, etc.)
  const getHardwareTag = (productName) => {
    const name = (productName || "").toUpperCase();
    if (name.includes("RTX") || name.includes("GEFORCE") || name.includes("RADEON") || name.includes("GPU")) {
      return "GPU";
    }
    if (name.includes("RYZEN") || name.includes("CORE") || name.includes("INTEL") || name.includes("CPU")) {
      return "CPU";
    }
    if (name.includes("SSD") || name.includes("NVME") || name.includes("PRO 1TB") || name.includes("PRO 2TB")) {
      return "SSD";
    }
    if (name.includes("DDR") || name.includes("RAM") || name.includes("MEMORY")) {
      return "RAM";
    }
    if (name.includes("CASE") || name.includes("CHASSIS") || name.includes("TOWER")) {
      return "RIG";
    }
    return "HARDWARE";
  };

  // 1. Unauthenticated View
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="order-details-page-wrapper">
        <div className="order-state-box unauth-state">
          <div className="state-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="state-prefix-code">// DISPATCH_AUTHENTICATION_REQUIRED</span>
          <h2 className="state-headline">Access Restricted</h2>
          <p className="state-desc">
            Please log in with your verified credentials to inspect order tracking telemetry and shipment diagnostics.
          </p>
          <Link to="/login" className="state-primary-btn">
            Log In to Access Order →
          </Link>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading || authLoading) {
    return (
      <div className="order-details-page-wrapper loading-view">
        <div className="corvun-spinner" />
        <p className="loading-text">INTERROGATING ORDER MANIFEST TELEMETRY...</p>
      </div>
    );
  }

  // 3. Error State
  if (error || !order) {
    return (
      <div className="order-details-page-wrapper">
        <div className="order-state-box error-state">
          <div className="state-icon-circle error-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span className="state-prefix-code">// MANIFEST_NOT_FOUND</span>
          <h2 className="state-headline">Order Manifest Unavailable</h2>
          <p className="state-desc">
            {error || "We could not find the requested hardware order in your account archive."}
          </p>
          <div className="state-actions-row">
            <Link to="/my-orders" className="state-primary-btn">
              ← Return to My Orders
            </Link>
            <button
              type="button"
              onClick={fetchOrder}
              className="state-secondary-btn"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tracking Stage Calculations
  const currentStatus = (order.status || "pending").toLowerCase();
  const isCancelled = currentStatus === "cancelled";

  // Timeline step active logic
  const isOrderPlacedActive = true;
  const isPackedActive = ["processing", "shipped", "delivered"].includes(currentStatus);
  const isShippedActive = ["shipped", "delivered"].includes(currentStatus);
  const isDeliveredActive = currentStatus === "delivered";

  // Address Resolution
  const address =
    order.shipping_address || {
      full_name: order.customer_name || user?.full_name || "Vikramaditya Rao",
      phone: order.customer_phone || user?.phone || "+91 98840 XXXXX",
      address_line1: "Flat 902, Apex Towers, Brigade Gateway Campus",
      address_line2: "Rajajinagar",
      city: "Bengaluru",
      state: "Karnataka",
      postal_code: "560055",
      country: "India",
    };

  return (
    <div className="order-details-page-wrapper">
      {/* Toast Feedback Banner */}
      {feedback && (
        <div className={`details-toast-alert alert-${feedback.type}`} role="alert">
          <span className="toast-dot" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="details-top-nav-bar">
        <Link to="/my-orders" className="back-to-orders-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>BACK TO ORDERS</span>
        </Link>
      </div>

      {/* Main Order Header Block (Matches Image 1 & 2) */}
      <header className="details-header-card">
        <div className="details-header-left">
          <div className="order-id-badge-row">
            <h1 className="order-id-heading">
              Order ID: #{order.order_number || `CRV-${order.id}`}
            </h1>
            <span className={`order-status-pill status-${currentStatus}`}>
              {isCancelled ? "Cancelled" : currentStatus === "delivered" ? "Confirmed" : currentStatus.toUpperCase()}
            </span>
          </div>

          <div className="order-meta-subline">
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="invoice-text-link"
              title="Print Order Invoice"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Invoice</span>
            </button>
            <span className="meta-bullet">•</span>
            <span className="transaction-id-text">
              Transaction ID: TXN_{order.order_number ? order.order_number.replace(/[^a-zA-Z0-9]/g, "") : order.id}
            </span>
          </div>
        </div>

        <div className="details-header-right">
          <div className="dates-meta-col">
            <span className="date-meta-item">
              <span className="date-label">Order date:</span> {formatDate(order.created_at)}
            </span>
            <span className="date-meta-item">
              <span className="date-label">
                {currentStatus === "delivered" ? "Delivered on:" : "Estimated delivery:"}
              </span>{" "}
              {formatDate(order.updated_at || order.created_at)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDownloadInvoice}
            className="download-invoice-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Invoice</span>
          </button>
        </div>
      </header>

      {/* Card 1: Order Status / Tracking Timeline (Matches Image 1 & 2) */}
      <section className="details-card order-status-timeline-card">
        <div className="card-header-line">
          <h2 className="card-title">Order Status</h2>
          <span className="carrier-telemetry-tag">
            Carrier: Corvun Express Secure Logistics
          </span>
        </div>

        {isCancelled ? (
          <div className="cancelled-timeline-notice">
            <div className="cancelled-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="cancelled-title">Order Decommissioned // Cancelled</h3>
              <p className="cancelled-desc">
                This dispatch manifest was aborted on {formatDate(order.updated_at || order.created_at)}.
                No further logistical routing will be processed.
              </p>
            </div>
          </div>
        ) : (
          <div className="tracking-timeline-flow">
            {/* Stage 1: Order Placed */}
            <div className={`timeline-stage-node ${isOrderPlacedActive ? "is-active" : ""}`}>
              <div className="stage-icon-ring">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="stage-name">Order Placed</span>
              <span className="stage-timestamp">{formatDate(order.created_at)}</span>
            </div>

            {/* Connecting Connector 1 */}
            <div className={`timeline-connector-bar ${isPackedActive ? "bar-completed" : ""}`} />

            {/* Stage 2: Packed */}
            <div className={`timeline-stage-node ${isPackedActive ? "is-active" : ""}`}>
              <div className="stage-icon-ring">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="stage-name">Packed</span>
              <span className="stage-timestamp">
                {isPackedActive ? formatDate(order.updated_at) : "Awaiting Bench"}
              </span>
            </div>

            {/* Connecting Connector 2 */}
            <div className={`timeline-connector-bar ${isShippedActive ? "bar-completed" : ""}`} />

            {/* Stage 3: Shipped */}
            <div className={`timeline-stage-node ${isShippedActive ? "is-active" : ""}`}>
              <div className="stage-icon-ring">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <span className="stage-name">Shipped</span>
              <span className="stage-timestamp">
                {isShippedActive ? formatDate(order.updated_at) : "Air Priority"}
              </span>
            </div>

            {/* Connecting Connector 3 */}
            <div className={`timeline-connector-bar ${isDeliveredActive ? "bar-completed" : ""}`} />

            {/* Stage 4: Delivered */}
            <div className={`timeline-stage-node ${isDeliveredActive ? "is-active" : ""}`}>
              <div className="stage-icon-ring">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span className="stage-name">Delivered</span>
              <span className="stage-timestamp">
                {isDeliveredActive ? formatDate(order.updated_at) : `Est. ${formatDate(order.updated_at)}`}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Card 2: Order Items (Matches Image 1 & 2) */}
      <section className="details-card order-items-manifest-card">
        <div className="card-header-line">
          <h2 className="card-title">Order Items</h2>
          <span className="items-count-badge">
            {order.items_count || order.items?.length || 1} Items in Package
          </span>
        </div>

        <div className="order-items-list-container">
          {(order.items || []).map((item, idx) => {
            const hwTag = getHardwareTag(item.product_name);
            return (
              <div key={item.id || idx} className="manifest-item-row">
                <div className="manifest-item-left">
                  {/* Item Hardware Thumbnail */}
                  <div className="item-thumbnail-box">
                    <span className="item-hw-tag">{hwTag}</span>
                    {item.product_image ? (
                      <img
                        src={resolveImageUrl(item.product_image)}
                        alt={item.product_name}
                        className="item-actual-img"
                      />
                    ) : (
                      <svg
                        className="item-fallback-icon"
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                      </svg>
                    )}
                  </div>

                  {/* Item Description */}
                  <div className="item-details-meta">
                    <h3 className="item-product-name">{item.product_name}</h3>
                    <div className="item-specs-subline">
                      {item.variant_name && (
                        <span className="spec-token">{item.variant_name}</span>
                      )}
                      <span className="spec-token">Qty {item.quantity}</span>
                      {item.sku && (
                        <span className="spec-token">SKU: {item.sku}</span>
                      )}
                      <span className="warranty-token">
                        • 3 Year Corvun Shield Warranty
                      </span>
                    </div>
                  </div>
                </div>

                {/* Item Price */}
                <div className="manifest-item-price-col">
                  <span className="item-total-price">
                    ₹{Number(item.total_amount).toLocaleString("en-IN")}
                  </span>
                  <span className="item-unit-subtext">
                    ₹{Number(item.unit_price).toLocaleString("en-IN")} each
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2-Column Bottom Layout: Order Summary (Left) & Delivery/Payment (Right) */}
      <div className="details-bottom-grid">
        {/* Left Column: Order Financial Summary */}
        <div className="details-bottom-col">
          <section className="details-card financial-summary-card">
            <h2 className="card-title mb-16">Order Summary</h2>

            <div className="summary-line-item">
              <span className="line-item-label">Subtotal</span>
              <span className="line-item-value">
                ₹{Number(order.subtotal).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="summary-line-item">
              <span className="line-item-label">Shipping</span>
              <div className="shipping-value-wrapper">
                <span className="shipping-pill">Express Air</span>
                <span className="line-item-value text-green">
                  {Number(order.shipping_amount) === 0 ? "Free" : `₹${Number(order.shipping_amount).toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

            <div className="summary-line-item">
              <span className="line-item-label">Tax (GST 18% included)</span>
              <span className="line-item-value">
                ₹{Number(order.tax_amount).toLocaleString("en-IN")}
              </span>
            </div>

            {Number(order.discount_amount) > 0 && (
              <div className="summary-line-item">
                <span className="line-item-label">Promotional Discount</span>
                <span className="line-item-value text-green">
                  -₹{Number(order.discount_amount).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="summary-divider" />

            <div className="summary-total-row">
              <span className="total-label">Total</span>
              <span className="total-amount-highlight">
                ₹{Number(order.total_amount).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Insurance Tag */}
            <div className="transit-protection-footer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>
                Corvun Zero-Damage Transit Protection included automatically with this order.
              </span>
            </div>
          </section>
        </div>

        {/* Right Column: Shipping Address & Payment Method */}
        <div className="details-bottom-col">
          {/* Shipping Address Box */}
          <section className="details-card address-box-card">
            <div className="card-header-line mb-14">
              <h2 className="card-title">Shipping Address</h2>
              <span className="verified-address-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Verified Address</span>
              </span>
            </div>

            <div className="address-entry-row">
              <svg className="entry-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div className="entry-content">
                <span className="recipient-name">
                  {address.full_name || order.customer_name || user?.full_name || "Vikramaditya Rao"}
                </span>
                <span className="recipient-title-sub">Lead Systems Architect</span>
              </div>
            </div>

            <div className="address-entry-row">
              <svg className="entry-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="full-address-text">
                {address.address_line1}
                {address.address_line2 ? `, ${address.address_line2}` : ""}
                {address.city ? `, ${address.city}` : ""}
                {address.state ? `, ${address.state}` : ""}
                {address.postal_code ? ` ${address.postal_code}` : ""}
                {address.country ? `, ${address.country}` : ""}
              </span>
            </div>

            <div className="address-entry-row">
              <svg className="entry-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="recipient-phone">
                {address.phone || order.customer_phone || user?.phone || "+91 98840 XXXXX"}
              </span>
            </div>
          </section>

          {/* Payment Method Box */}
          <section className="details-card payment-method-card">
            <div className="card-header-line mb-14">
              <h2 className="card-title">Payment Method</h2>
              <span className="paid-status-tag">
                {order.payment_status === "completed"
                  ? "Paid in Full"
                  : order.payment_status?.toUpperCase() || "PENDING"}
              </span>
            </div>

            <div className="payment-display-row">
              <div className="payment-card-badge">
                <span className="card-brand-txt">VISA</span>
              </div>
              <div className="payment-meta-text">
                <span className="payment-type-headline">
                  Credit Card ending in 4242
                </span>
                <span className="payment-exp-text">Expires 12/28</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Cancellation Action Box (Matches Image 1) */}
      {currentStatus === "pending" && (
        <section className="details-card cancel-prompt-card">
          <span className="cancel-prompt-question">Need to cancel?</span>
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="cancel-order-primary-btn"
          >
            CANCEL ORDER
          </button>
        </section>
      )}

      {/* Alternative Bottom Navigation Bar */}
      <div className="details-bottom-actions-row">
        <Link to="/products" className="bottom-continue-btn">
          ← Continue Shopping
        </Link>
        <Link to="/my-orders" className="bottom-orders-btn">
          View All Orders →
        </Link>
      </div>

      {/* Cyberpunk Cancel Confirmation Modal Dialog */}
      {showCancelModal && (
        <div className="order-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div
            className="order-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="cancel-title"
          >
            <div className="cancel-modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h3 id="cancel-title" className="cancel-modal-title">
              Abort Hardware Dispatch?
            </h3>
            <p className="cancel-modal-desc">
              Are you sure you want to cancel order #{order.order_number || order.id}?
              Once cancelled, reserved components will be returned to the open repository.
            </p>

            <div className="cancel-modal-actions">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="cancel-keep-btn"
              >
                Keep Order Active
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="cancel-confirm-btn"
              >
                {isCancelling ? "Aborting Dispatch..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetails;
