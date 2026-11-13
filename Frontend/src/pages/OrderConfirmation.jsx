import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOrderDetail } from "../services/orderService";
import "./OrderConfirmation.css";

function OrderConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Retrieve identifiers from URL search params or router location state
  const orderIdFromUrl = searchParams.get("order_id") || searchParams.get("id");
  const orderIdFromState = location.state?.orderId || location.state?.order?.id;
  const targetOrderId = orderIdFromUrl || orderIdFromState;

  const initialOrder = location.state?.order || null;
  const initialLoading = !initialOrder && Boolean(targetOrderId);
  const initialError = !targetOrderId && !initialOrder ? "NO_ORDER_TELEMETRY" : "";

  // Local state
  const [order, setOrder] = useState(initialOrder);
  const [paymentInfo] = useState(location.state?.payment || null);
  const [paymentMethod] = useState(location.state?.paymentMethod || "cod");
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(initialError);
  const [copied, setCopied] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Fetch authoritative order record from the backend
  useEffect(() => {
    let isMounted = true;

    if (!targetOrderId) {
      return;
    }

    if (!authLoading && isAuthenticated) {
      getOrderDetail(targetOrderId)
        .then((res) => {
          if (!isMounted) return;
          if (res?.order) {
            setOrder(res.order);
            setError("");
          } else {
            setError("ORDER_NOT_FOUND");
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Order detail fetch failed:", err);
          setError(err.response?.status === 404 ? "ORDER_NOT_FOUND" : "FETCH_ERROR");
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [targetOrderId, isAuthenticated, authLoading]);

  // Copy order number to clipboard
  const handleCopyOrderId = () => {
    const idToCopy = order?.order_number || `#CORVUN-${targetOrderId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(idToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "Recent Date";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Derive component badge initials or category acronym
  const getCategoryBadge = (name = "") => {
    const n = name.toUpperCase();
    if (n.includes("RTX") || n.includes("GEFORCE") || n.includes("RADEON") || n.includes("GPU")) return "GPU";
    if (n.includes("RYZEN") || n.includes("CORE") || n.includes("INTEL") || n.includes("CPU")) return "CPU";
    if (n.includes("SSD") || n.includes("NVME") || n.includes("M.2") || n.includes("STORAGE")) return "NVME";
    if (n.includes("RAM") || n.includes("DDR5") || n.includes("DDR4") || n.includes("MEMORY")) return "RAM";
    if (n.includes("MOTHERBOARD") || n.includes("CHIPSET") || n.includes("BOARD")) return "MB";
    if (n.includes("POWER") || n.includes("PSU") || n.includes("WATT")) return "PSU";
    if (n.includes("COOLER") || n.includes("AIO") || n.includes("LIQUID")) return "AIO";
    return "HW";
  };

  // Derive component role label
  const getRoleLabel = (name = "") => {
    const n = name.toUpperCase();
    if (n.includes("RTX") || n.includes("GPU")) return "GPU MODULE";
    if (n.includes("RYZEN") || n.includes("INTEL") || n.includes("CPU")) return "COMPUTE CORE";
    if (n.includes("NVME") || n.includes("SSD")) return "NVME STORAGE";
    if (n.includes("RAM") || n.includes("DDR")) return "SYSTEM MEMORY";
    return "CORE HARDWARE";
  };

  // 1. Loading State
  if (loading || authLoading) {
    return (
      <div className="order-conf-page-wrapper conf-loading-view">
        <div className="corvun-spinner" />
        <p className="conf-loading-text">INTERROGATING SECURE HARDWARE DISPATCH GATEWAY...</p>
      </div>
    );
  }

  // 2. Payment Failure State (Matches Image 2 exactly)
  const isPaymentFailed =
    order?.payment_status === "failed" ||
    paymentInfo?.status === "failed" ||
    searchParams.get("payment") === "failed";

  if (isPaymentFailed) {
    return (
      <div className="order-conf-page-wrapper">
        <div className="conf-breadcrumb-bar">
          <span className="breadcrumb-path">
            <Link to="/">HOME</Link> / <Link to="/checkout">CHECKOUT</Link> /{" "}
            <span className="active-path">ORDER STATUS</span>
          </span>
        </div>

        <div className="conf-failed-container">
          <div className="conf-failed-card">
            <div className="failed-icon-box">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <h1 className="failed-title">Payment Failed</h1>
            <p className="failed-subtitle">
              Your payment could not be processed. Please check your payment details and try again.
            </p>

            <div className="failed-reasons-box">
              <h4 className="reasons-title">Possible reasons:</h4>
              <ul className="reasons-list">
                <li>Insufficient funds</li>
                <li>Invalid card details</li>
                <li>Bank declined transaction</li>
                <li>Network connectivity issues</li>
              </ul>
            </div>

            <button
              type="button"
              className="failed-retry-btn"
              onClick={() => navigate("/checkout")}
            >
              Try Again
            </button>

            <Link to="/products" className="failed-support-link">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error / No Order Identifier State
  if (error || !order) {
    return (
      <div className="order-conf-page-wrapper">
        <div className="conf-failed-container">
          <div className="conf-failed-card">
            <span className="card-corner corner-top-left" />
            <span className="card-corner corner-bottom-right" />

            <div className="empty-telemetry-badge">
              {error === "ORDER_NOT_FOUND" ? "404 // NOT_LOCATED" : "NULL_SESSION // DISPATCH"}
            </div>

            <h2 className="failed-title">
              {error === "ORDER_NOT_FOUND"
                ? "Order Record Not Located"
                : "No Active Order Found"}
            </h2>

            <p className="failed-subtitle">
              {error === "ORDER_NOT_FOUND"
                ? `Unable to retrieve hardware telemetry for order #${targetOrderId}. The record may have expired or belongs to another workstation profile.`
                : "No order creation event was detected for this session. Explore our catalog or review your order logs."}
            </p>

            <div className="conf-error-actions">
              <Link to="/products" className="failed-retry-btn">
                RETURN TO CATALOG →
              </Link>
              <Link to="/" className="failed-support-link">
                Home Workstation
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Success State (Matches Image 1 exactly)
  const items = Array.isArray(order?.items) ? order.items : [];
  const shippingAddress = order?.shipping_address || {};
  const customerName =
    order?.customer_name || shippingAddress.full_name || "Valued Engineer";
  const customerEmail = order?.customer_email || "your registered email";
  const formattedDate = formatDate(order?.created_at);

  const subtotalNum = parseFloat(order?.subtotal || 0);
  const totalAmountNum = parseFloat(order?.total_amount || 0);

  // Authoritative Payment Status Evaluation
  const isCod =
    paymentMethod === "cod" ||
    paymentInfo?.payment_method === "cod" ||
    order?.payment_status === "pending";

  const isConfirmedPaid =
    order?.payment_status === "completed" ||
    paymentInfo?.status === "completed";

  return (
    <div className="order-conf-page-wrapper">
      {/* Top Protocol Telemetry Notice */}
      <section className="conf-hero-section">
        <div className="conf-success-indicator">
          <div className="outer-halo-ring" />
          <div className="inner-halo-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <span className="conf-protocol-tag">
          <span className="protocol-dot red-glow" />
          TRANSACTION AUTHENTICATED // NODE 0X9F4
        </span>

        <h1 className="conf-headline">Order Placed Successfully!</h1>

        <p className="conf-subheadline">
          Thank you for your purchase, {customerName}! Your hardware is queued for precision bench validation by our technicians.
        </p>

        {/* Telemetry Pills Row */}
        <div className="conf-telemetry-pills">
          <div className="telemetry-pill order-id-pill" onClick={handleCopyOrderId} title="Click to copy Order ID">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>ORDER ID: #{order.order_number || order.id}</span>
            <span className={`copy-badge ${copied ? "copied" : ""}`}>
              {copied ? "COPIED!" : "COPY"}
            </span>
          </div>

          <div className="telemetry-pill express-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span>Corvun Insured Express — {formattedDate}</span>
          </div>
        </div>

        <div className="conf-notice-callout">
          <p>
            We've dispatched an encrypted tax invoice and real-time hardware telemetry link to{" "}
            <strong>{customerEmail}</strong>.
          </p>
        </div>
      </section>

      {/* Two-Column Grid: Hardware Summary & Technician Lab Status */}
      <div className="conf-matrix-grid">
        {/* Left Column: Ordered Hardware Summary */}
        <div className="conf-hardware-card">
          <span className="card-corner corner-top-left" />
          <span className="card-corner corner-bottom-right" />

          <div className="hardware-card-header">
            <div className="hdr-left">
              <div className="hdr-chip-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <div>
                <h3 className="hdr-title">Ordered Hardware Summary</h3>
                <span className="hdr-subtext">
                  {order.items_count || items.length} ARCHITECTURAL UNITS CONFIRMED
                </span>
              </div>
            </div>

            <span className="stock-verified-badge">VERIFIED STOCK</span>
          </div>

          {/* List of Ordered Components */}
          <div className="conf-items-list">
            {items.map((item) => {
              const unitPriceNum = parseFloat(item.unit_price || 0);
              const lineTotalNum = parseFloat(item.total_amount || unitPriceNum * (item.quantity || 1));
              const badgeTag = getCategoryBadge(item.product_name);
              const roleTag = getRoleLabel(item.product_name);

              return (
                <div key={item.id} className="conf-item-row">
                  <div className="conf-item-thumb">
                    <span className="thumb-badge">{badgeTag}</span>
                  </div>

                  <div className="conf-item-info">
                    <span className="item-role-tag">
                      {roleTag} • Qty: {item.quantity}
                    </span>
                    <h4 className="item-prod-name">{item.product_name}</h4>
                    <p className="item-variant-spec">
                      {item.variant_name
                        ? `${item.variant_name} // SKU: ${item.sku}`
                        : `SKU: ${item.sku} // Factory Calibrated Base Matrix`}
                    </p>
                  </div>

                  <div className="conf-item-price-box">
                    <span className="conf-line-price">
                      ₹{lineTotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="conf-gst-tag">GST Included</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settlement Tier */}
          <div className="conf-settlement-row">
            <div className="settlement-label-box">
              <span className="settlement-code">SETTLEMENT TIER</span>
              <span className="settlement-name">Total Paid</span>
            </div>

            <div className="settlement-amount-box">
              <span className="settlement-val">
                ₹{totalAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Method Security Note */}
          <div className="conf-payment-security-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              {isConfirmedPaid
                ? "Payment Verified via 256-Bit SSL Secure Gateway"
                : isCod
                ? "Cash on Delivery Authenticated // Payment Due on Arrival Inspection"
                : "Payment Authorization Session Established"}
            </span>
          </div>

          {/* Shipment Destination Card */}
          <div className="conf-destination-card">
            <div className="dest-icon-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="dest-info">
              <span className="dest-tag">SHIPMENT DESTINATION</span>
              <h5 className="dest-name">{shippingAddress.full_name || customerName}</h5>
              <p className="dest-address">
                {[
                  shippingAddress.address_line1,
                  shippingAddress.address_line2,
                  shippingAddress.city,
                  shippingAddress.state,
                  shippingAddress.postal_code,
                  shippingAddress.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "Address telemetry stored in dispatch manifest"}
              </p>
              {shippingAddress.phone && (
                <span className="dest-phone">Terminal Contact: {shippingAddress.phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Technician Lab Status (Bay #14) */}
        <aside className="conf-lab-card">
          <span className="card-corner corner-top-left" />
          <span className="card-corner corner-bottom-right" />

          <div className="lab-header">
            <span className="lab-indicator-dot red-glow" />
            <span className="lab-title">TECHNICIAN LAB STATUS</span>
            <span className="lab-bay-badge">Bay #14</span>
          </div>

          {/* Rig Preview Card */}
          <div className="lab-rig-display">
            <div className="rig-graphic-overlay">
              <div className="authenticity-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Corvun Seal of Authenticity
              </div>
              <div className="rig-id-tag">
                RIG-ID: PROTO-{(order.id * 17) % 89 + 10}-X
              </div>
            </div>

            {/* Glowing PC graphic illustration */}
            <div className="rig-chassis-art">
              <div className="chassis-core-glow" />
              <div className="liquid-loop-red" />
              <div className="fan-ring-1" />
              <div className="fan-ring-2" />
            </div>
          </div>

          {/* Diagnostics Pipeline Stage */}
          <div className="diagnostics-pipeline-box">
            <div className="diag-header-row">
              <span className="diag-title">DIAGNOSTICS PIPELINE</span>
              <span className="diag-stage-count">Stage 1 of 4 Queued</span>
            </div>

            <div className="pipeline-steps-track">
              <div className="pipeline-step step-active">
                <span className="step-marker" />
                <span className="step-name">Intake</span>
              </div>
              <div className="pipeline-step">
                <span className="step-marker" />
                <span className="step-name">Stress Burn-in</span>
              </div>
              <div className="pipeline-step">
                <span className="step-marker" />
                <span className="step-name">Firmware Flash</span>
              </div>
              <div className="pipeline-step">
                <span className="step-marker" />
                <span className="step-name">Packaging</span>
              </div>
            </div>
          </div>

          {/* Lab Message */}
          <div className="lab-notice-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p>
              24-Hour Prime Stress Testing &amp; BIOS Flashing will commence shortly. Our engineers verify thermal equilibrium before dispatching hardware seals.
            </p>
          </div>

          {/* Diagnostics Metrics Footer */}
          <div className="lab-metrics-footer">
            <div className="metric-col">
              <span className="metric-label">Thermal Guard</span>
              <span className="metric-value green-text">Active</span>
            </div>
            <div className="metric-col">
              <span className="metric-label">Burn-In</span>
              <span className="metric-value">24 Hrs</span>
            </div>
            <div className="metric-col">
              <span className="metric-label">Warranty</span>
              <span className="metric-value">3-Yr Full</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Action Controls */}
      <div className="conf-bottom-actions">
        <Link
          to={`/orders/${order.id}`}
          className="action-btn-primary"
        >
          View Order Details →
        </Link>

        <Link to="/my-orders" className="action-btn-secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          My Orders
        </Link>

        <Link to="/products" className="action-btn-secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Continue Shopping
        </Link>
      </div>

      {/* Order Details Telemetry Modal */}
      {detailsModalOpen && (
        <div className="conf-modal-backdrop" onClick={() => setDetailsModalOpen(false)}>
          <div className="conf-modal-card" onClick={(e) => e.stopPropagation()}>
            <span className="card-corner corner-top-left" />
            <span className="card-corner corner-bottom-right" />

            <div className="modal-header-row">
              <div>
                <span className="modal-protocol-tag">// AUTHORITATIVE_DISPATCH_RECORD</span>
                <h3 className="modal-headline">Order Manifest #{order.order_number || order.id}</h3>
              </div>
              <button
                type="button"
                className="modal-close-icon"
                onClick={() => setDetailsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-breakdown-list">
              <div className="breakdown-row">
                <span>Hardware Components Subtotal</span>
                <span>₹{subtotalNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-row">
                <span>Discount Rebates</span>
                <span>−₹{parseFloat(order.discount_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-row">
                <span>Express Insured Shipping</span>
                <span className="green-text">
                  {parseFloat(order.shipping_amount || 0) === 0
                    ? "FREE"
                    : `₹${parseFloat(order.shipping_amount).toLocaleString("en-IN")}`}
                </span>
              </div>
              <div className="breakdown-row">
                <span>Integrated GST (18%)</span>
                <span>₹{parseFloat(order.tax_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="modal-divider" />

              <div className="breakdown-row total-highlight">
                <span>Authoritative Grand Total</span>
                <span className="highlight-price">
                  ₹{totalAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="breakdown-row meta-row">
                <span>Order Status: <strong>{order.status?.toUpperCase()}</strong></span>
                <span>Payment Status: <strong>{order.payment_status?.toUpperCase()}</strong></span>
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-dismiss-btn"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderConfirmation;
