import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyOrders, cancelOrder, getAddresses } from "../services/orderService";
import "./MyOrders.css";

function MyOrders() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();

  // Data & loading states
  const [orders, setOrders] = useState([]);
  const [addressesCount, setAddressesCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters, search, and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Auto-dismiss feedback message
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyOrders();
      setOrders(Array.isArray(res?.orders) ? res.orders : []);
    } catch (err) {
      console.error("Orders load failed:", err);
      setError("Failed to interrogate order repository node. Please verify connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!authLoading && isAuthenticated) {
      Promise.all([getMyOrders(), getAddresses().catch(() => ({ addresses: [] }))])
        .then(([orderRes, addrRes]) => {
          if (!isMounted) return;
          setOrders(Array.isArray(orderRes?.orders) ? orderRes.orders : []);
          setAddressesCount(Array.isArray(addrRes?.addresses) ? addrRes.addresses.length : 1);
          setError("");
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Orders load failed:", err);
          setError("Failed to interrogate order repository node. Please verify connection.");
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else if (!authLoading && !isAuthenticated) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuthenticated]);

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Request cancellation for order #${orderId}? This cannot be undone.`)) {
      return;
    }

    setCancellingId(orderId);
    try {
      const res = await cancelOrder(orderId);
      setFeedback({
        type: "success",
        message: res?.message || `Order #${orderId} has been successfully cancelled.`,
      });
      // Refresh list
      await fetchOrders();
    } catch (err) {
      console.error("Cancel order error:", err);
      const errMsg =
        err.response?.data?.error || "Order cancellation request rejected by dispatch node.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Helper date formatter
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

  // Helper badge initials based on hardware title
  const getBadgeInitials = (name = "") => {
    const n = name.toUpperCase();
    if (n.includes("RTX") || n.includes("GEFORCE") || n.includes("RADEON") || n.includes("GPU")) return "GPU";
    if (n.includes("RYZEN") || n.includes("CORE") || n.includes("INTEL") || n.includes("CPU")) return "CPU";
    if (n.includes("SSD") || n.includes("NVME") || n.includes("M.2")) return "NVME";
    if (n.includes("RAM") || n.includes("DDR5") || n.includes("DDR4")) return "RAM";
    if (n.includes("MOTHERBOARD") || n.includes("BOARD")) return "MB";
    if (n.includes("POWER") || n.includes("PSU")) return "PSU";
    return "HW";
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const processing = orders.filter((o) => o.status === "processing").length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    return { total, pending, processing, shipped, delivered, cancelled };
  }, [orders]);

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status?.toLowerCase() === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((o) => {
        const matchesNum = (o.order_number || String(o.id)).toLowerCase().includes(q);
        const matchesItem = (o.items || []).some(
          (item) =>
            item.product_name?.toLowerCase().includes(q) ||
            item.sku?.toLowerCase().includes(q)
        );
        return matchesNum || matchesItem;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Handle Page Change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  // 1. Unauthenticated View
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="orders-page-wrapper">
        <div className="orders-unauth-card">
          <span className="card-corner corner-top-left" />
          <span className="card-corner corner-bottom-right" />
          <div className="unauth-icon-box">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="unauth-code">// ENCRYPTED_USER_SPACE</span>
          <h2 className="unauth-title">Authentication Required</h2>
          <p className="unauth-desc">
            Please log in with your verified Corvun terminal profile to view your active hardware orders, shipment telemetry, and diagnostic logs.
          </p>
          <Link to="/login" className="unauth-login-btn">
            ACCESS TERMINAL →
          </Link>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading || authLoading) {
    return (
      <div className="orders-page-wrapper orders-loading-view">
        <div className="corvun-spinner" />
        <p className="orders-loading-text">INTERROGATING WORKSTATION ORDER ARCHIVE...</p>
      </div>
    );
  }

  return (
    <div className="orders-page-wrapper">
      {/* Toast Notification */}
      {feedback && (
        <div className={`orders-toast-alert alert-${feedback.type}`}>
          <span className="toast-dot" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Breadcrumb & Page Header (Matches Customer Profile Theme) */}
      <div className="orders-header-container">
        <nav className="orders-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-link">My Account</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">My Orders</span>
        </nav>

        <div className="orders-title-row">
          <div>
            <h1 className="orders-headline">My Orders</h1>
            <p className="orders-subtitle">
              Review status, track shipments, and inspect past order transactions.
            </p>
          </div>

          <Link to="/profile" className="orders-view-profile-btn">
            <svg
              className="view-profile-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>View Personal Profile</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout (Sidebar Profile + Orders Dashboard) */}
      <div className="orders-workspace-layout">
        {/* Left Column: Account Navigation Sidebar (Matches Customer Profile) */}
        <aside className="orders-profile-sidebar">
          <div className="sidebar-nav-card">
            <div className="sidebar-header-label">ACCOUNT NAVIGATION</div>

            <nav className="sidebar-nav-list">
              {/* 1. Personal Info */}
              <Link to="/profile" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Personal Info</span>
                </div>
              </Link>

              {/* 2. My Orders (Active) */}
              <Link to="/my-orders" className="sidebar-nav-item active-nav-pill">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>My Orders</span>
                </div>
                <div className="nav-item-right-group">
                  <span className="sidebar-badge active-orders-badge">
                    {Math.max(1, metrics.pending + metrics.processing)} Active
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>

              {/* 3. Saved Addresses */}
              <Link to="/addresses" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Saved Addresses</span>
                </div>
                <span className="sidebar-badge number-badge">{addressesCount}</span>
              </Link>

              {/* 4. Wishlist */}
              <Link to="/wishlist" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>Wishlist</span>
                </div>
                <span className="sidebar-badge number-badge">7 items</span>
              </Link>

              {/* 5. Wallet & Credits */}
              <Link to="/profile#wallet" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span>Wallet &amp; Credits</span>
                </div>
                <span className="sidebar-badge wallet-badge">$1,420.00</span>
              </Link>

              {/* 6. My Reviews */}
              <div className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>My Reviews</span>
                </div>
                <span className="sidebar-badge number-badge">14</span>
              </div>

              {/* 7. Questions & Answers */}
              <div className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Questions &amp; Answers</span>
                </div>
              </div>

              {/* 8. Referrals */}
              <div className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span>Referrals</span>
                </div>
                <span className="sidebar-dot-badge" />
              </div>

              {/* 9. Log Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-nav-item logout-nav-item"
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log Out</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Need Assistance Support Card */}
          <div className="sidebar-assistance-card">
            <div className="assistance-title-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef3842" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
              <h4 className="assistance-title">Need Assistance?</h4>
            </div>
            <p className="assistance-text">
              Our technical customer support team is available 24/7 for order and build queries.
            </p>
            <a
              href="mailto:support@corvun.io"
              className="assistance-link"
              onClick={(e) => {
                e.preventDefault();
                setFeedback({ type: "info", message: "Support ticket desk dispatched: Priority Level 1." });
              }}
            >
              Contact Support →
            </a>
          </div>
        </aside>

        {/* Main Orders Dashboard Area */}
        <main className="orders-main-dashboard">
          {/* Header Block / Indicator */}
          <div className="orders-header-row">
            <div className="orders-sync-indicator">
              <span className="sync-dot green-pulse" />
              <span>Orders Synced: Active Matrix</span>
            </div>
          </div>

          {/* Metrics Summary Cards */}
          <div className="orders-metric-cards-grid">
            <div className="metric-card">
              <span className="metric-tag">TOTAL DISPATCHES</span>
              <span className="metric-number">{metrics.total}</span>
              <span className="metric-sub">Indexed in manifest</span>
            </div>

            <div className="metric-card">
              <span className="metric-tag yellow-text">PENDING APPROVAL</span>
              <span className="metric-number">{metrics.pending}</span>
              <span className="metric-sub">Queued for verification</span>
            </div>

            <div className="metric-card">
              <span className="metric-tag blue-text">IN LAB PROCESSING</span>
              <span className="metric-number">{metrics.processing}</span>
              <span className="metric-sub">Diagnostics &amp; assembly</span>
            </div>

            <div className="metric-card">
              <span className="metric-tag green-text">DELIVERED RIGS</span>
              <span className="metric-number">{metrics.delivered}</span>
              <span className="metric-sub">Hardware dispatched</span>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="orders-controls-bar">
            {/* Filter Tabs (Matches Image 2) */}
            <div className="orders-status-tabs">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "processing", label: "Processing" },
                { id: "shipped", label: "Shipped" },
                { id: "delivered", label: "Delivered" },
                { id: "cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`status-tab-btn ${statusFilter === tab.id ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                >
                  {tab.label}
                  {tab.id !== "all" && metrics[tab.id] > 0 && (
                    <span className="tab-count-badge">{metrics[tab.id]}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input & Sort Filter */}
            <div className="orders-search-sort-row">
              <div className="orders-search-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by order # or component..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="orders-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                className="orders-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Orders List Area */}
          {error ? (
            <div className="orders-state-box error-box">
              <div className="state-badge">TRANSACTION_ERROR</div>
              <p>{error}</p>
              <button type="button" className="retry-btn" onClick={fetchOrders}>
                Retry Interrogation
              </button>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="orders-state-box empty-box">
              <span className="card-corner corner-top-left" />
              <span className="card-corner corner-bottom-right" />
              <div className="empty-box-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>

              <span className="empty-code-badge">// NO_RECORDS_INDEXED</span>
              <h3 className="empty-headline">
                {searchQuery || statusFilter !== "all"
                  ? "No Orders Match Current Query"
                  : "No Workstation Orders Found"}
              </h3>
              <p className="empty-desc">
                {searchQuery || statusFilter !== "all"
                  ? "Adjust your status filter or query keywords to inspect other recorded transactions."
                  : "You haven't dispatched any hardware orders yet. Configure high-octane components from our repository."}
              </p>

              {searchQuery || statusFilter !== "all" ? (
                <button
                  type="button"
                  className="empty-cta-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters &amp; Reset
                </button>
              ) : (
                <Link to="/products" className="empty-cta-btn">
                  CONFIGURE HARDWARE BUILD →
                </Link>
              )}
            </div>
          ) : (
            <div className="orders-cards-stream">
              {paginatedOrders.map((order) => {
                const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                const otherItemsCount = (order.items?.length || 1) - 1;
                const formattedDate = formatDate(order.created_at);
                const badgeTag = getBadgeInitials(firstItem?.product_name || "Hardware");
                const isCancelling = cancellingId === order.id;

                // Status styling helpers
                const statusLower = order.status?.toLowerCase();
                const isDelivered = statusLower === "delivered";
                const isCancelled = statusLower === "cancelled";
                const isPending = statusLower === "pending";
                const isProcessing = statusLower === "processing";
                const isShipped = statusLower === "shipped";

                return (
                  <div key={order.id} className="order-summary-card">
                    <span className="card-corner corner-top-left" />
                    <span className="card-corner corner-bottom-right" />

                    {/* Thumbnail Box */}
                    <div className="order-thumb-box">
                      <span className="thumb-initials">{badgeTag}</span>
                      <svg
                        className="thumb-bg-icon"
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        {badgeTag === "GPU" ? (
                          <>
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <circle cx="8" cy="12" r="2.5" />
                            <circle cx="16" cy="12" r="2.5" />
                          </>
                        ) : badgeTag === "CPU" ? (
                          <>
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <rect x="9" y="9" width="6" height="6" />
                            <line x1="9" y1="1" x2="9" y2="4" />
                            <line x1="15" y1="1" x2="15" y2="4" />
                            <line x1="9" y1="20" x2="9" y2="23" />
                            <line x1="15" y1="20" x2="15" y2="23" />
                          </>
                        ) : (
                          <>
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M7 7h10v10H7z" />
                          </>
                        )}
                      </svg>
                    </div>

                    {/* Main Information Column */}
                    <div className="order-info-col">
                      <div className="order-header-line">
                        <span className="order-number-tag">
                          ORDER #{order.order_number || order.id}
                        </span>
                        <span className="order-date-tag">Purchased on {formattedDate}</span>
                      </div>

                      <h4 className="order-product-headline">
                        {firstItem?.product_name || "Custom Workstation Rig Component"}
                        {otherItemsCount > 0 && (
                          <span className="more-items-tag"> + {otherItemsCount} more</span>
                        )}
                      </h4>

                      <div className="order-meta-details-row">
                        <span className="order-amount-pill">
                          ₹{parseFloat(order.total_amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          <small>(Includes taxes)</small>
                        </span>

                        <span className="order-payment-pill">
                          {order.payment_status?.toUpperCase() === "COMPLETED"
                            ? "✓ Payment Confirmed"
                            : "Payment: " + (order.payment_status || "Pending")}
                        </span>

                        <span className="order-item-count-pill">
                          {order.items_count || order.items?.length || 1} units
                        </span>
                      </div>
                    </div>

                    {/* Right Status & Action Column */}
                    <div className="order-status-action-col">
                      <div
                        className={`order-status-pill ${
                          isDelivered
                            ? "status-delivered"
                            : isCancelled
                            ? "status-cancelled"
                            : isShipped
                            ? "status-shipped"
                            : isProcessing
                            ? "status-processing"
                            : "status-pending"
                        }`}
                      >
                        <span className="status-dot-indicator" />
                        <span className="status-text-capitalized">
                          {isDelivered
                            ? "Delivered"
                            : isCancelled
                            ? "Cancelled"
                            : isShipped
                            ? "Shipped"
                            : isProcessing
                            ? "Processing"
                            : "Pending"}
                        </span>
                      </div>

                      <div className="order-card-buttons">
                        {isPending && (
                          <button
                            type="button"
                            className="order-cancel-btn"
                            disabled={isCancelling}
                            onClick={() => handleCancelOrder(order.id)}
                            title="Cancel this pending order"
                          >
                            {isCancelling ? "Cancelling..." : "Cancel Order"}
                          </button>
                        )}

                        <Link
                          to={`/orders/${order.id}`}
                          className="order-inspect-arrow-btn"
                          title="Inspect Order Telemetry Manifest"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="orders-pagination-bar">
              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                ‹
              </button>

              <div className="pagination-numbers-list">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`page-index-btn ${num === currentPage ? "active" : ""}`}
                    onClick={() => handlePageChange(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                ›
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default MyOrders;
