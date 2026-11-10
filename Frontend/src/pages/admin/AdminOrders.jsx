import { useState, useEffect, useCallback } from "react";
import {
  getAdminOrders,
  getAdminOrderDetail,
  updateOrderStatus,
} from "../../services/adminOrderService";
import "./AdminOrders.css";

export default function AdminOrders() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8; // Per Figma layout: 8 rows per page

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ── Detail Drawer State ───────────────────────────────────────────── */
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  /* ── Auto-dismiss Toast ───────────────────────────────────────────── */
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  /* ── Fetch Orders ─────────────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        page_size: PAGE_SIZE,
        paginate: true,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;

      const data = await getAdminOrders(params);
      const results = data.results || data.orders || (Array.isArray(data) ? data : []);
      setOrders(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);

      // If drawer is open, keep selectedOrder in sync
      if (selectedOrder) {
        const updatedSelected = results.find((o) => o.id === selectedOrder.id);
        if (updatedSelected) {
          setSelectedOrder((prev) => ({ ...prev, ...updatedSelected }));
        }
      }
    } catch (err) {
      console.error("AdminOrders fetch error:", err);
      setError("Unable to load orders. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ── Search & Filter Handlers ─────────────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  /* ── Open Order Detail Drawer ─────────────────────────────────────── */
  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setDrawerLoading(true);
    try {
      const data = await getAdminOrderDetail(order.id);
      if (data && data.order) {
        setSelectedOrder(data.order);
      }
    } catch (err) {
      console.error("Failed to load order detail:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedOrder(null);
  };

  /* ── Update Status Handler ────────────────────────────────────────── */
  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder || selectedOrder.status === newStatus) return;

    setUpdatingStatus(true);
    try {
      const data = await updateOrderStatus(selectedOrder.id, newStatus);
      const updatedOrder = data.order || { ...selectedOrder, status: newStatus };
      setSelectedOrder(updatedOrder);

      // Update in local table list
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: newStatus } : o))
      );

      showToast(`Order #${selectedOrder.order_number} status updated to ${newStatus}.`);
    } catch (err) {
      console.error("Status update error:", err);
      showToast(err.response?.data?.error || "Failed to update order status.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ── Formatters ───────────────────────────────────────────────────── */
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "$0.00";
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "delivered":
        return "ao-status--delivered";
      case "shipped":
        return "ao-status--shipped";
      case "processing":
        return "ao-status--processing";
      case "confirmed":
        return "ao-status--confirmed";
      case "pending":
        return "ao-status--pending";
      case "cancelled":
        return "ao-status--cancelled";
      default:
        return "ao-status--pending";
    }
  };

  const formatStatusLabel = (status) => {
    if (!status) return "Pending";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  /* ── Pagination Calculations ──────────────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className={`ao-page ${selectedOrder ? "ao-page--drawer-open" : ""}`}>
      {/* ── Toast Notification ─────────────────────────────────────── */}
      {toast.show && (
        <div className={`ao-toast ${toast.type === "error" ? "ao-toast--error" : ""}`}>
          <div className="ao-toast-content">
            <span className="ao-toast-indicator"></span>
            <span>{toast.message}</span>
          </div>
          <button
            className="ao-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <div className="ao-main-container">
        {/* Header (Figma) */}
        <div className="ao-header">
          <div className="ao-header-left">
            <div className="ao-title-wrap">
              <h1 className="ao-title">Order Management</h1>
              <span className="ao-total-count-badge">
                Total {totalCount.toLocaleString()}
              </span>
            </div>
            <p className="ao-subtitle">View and manage customer orders and fulfillment states.</p>
          </div>
        </div>

        {/* Filter Bar (Figma) */}
        <div className="ao-filter-bar">
          <div className="ao-search-wrap">
            <svg
              className="ao-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="ao-search-input"
              placeholder="Search orders, customers, products..."
              value={search}
              onChange={handleSearchChange}
              id="order-search-input"
            />
          </div>

          <div className="ao-select-wrap">
            <select
              className="ao-select"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              id="order-status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table Container (Figma) */}
        <div className="ao-card">
          {loading ? (
            <div className="ao-loading-container">
              <div className="ao-spinner"></div>
              <p className="ao-loading-text">Loading orders from registry...</p>
            </div>
          ) : error ? (
            <div className="ao-empty ao-empty--error">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="ao-empty-title">Error Loading Orders</div>
              <div className="ao-empty-desc">{error}</div>
              <button className="ao-retry-btn" onClick={fetchOrders}>
                Retry
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="ao-empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <div className="ao-empty-title">No orders found.</div>
              <div className="ao-empty-desc">
                {search || statusFilter !== "all"
                  ? "No customer orders match your current search or status criteria."
                  : "When customers place hardware orders through checkout, they will appear dynamically in this table."}
              </div>
            </div>
          ) : (
            <div className="ao-table-wrap">
              <table className="ao-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>ORDER NUMBER</th>
                    <th style={{ width: "20%" }}>CUSTOMER</th>
                    <th style={{ width: "16%" }}>DATE</th>
                    <th style={{ width: "10%" }}>ITEMS</th>
                    <th style={{ width: "14%" }}>TOTAL</th>
                    <th style={{ width: "12%" }}>STATUS</th>
                    <th style={{ width: "6%" }} className="ao-th-right">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    const itemsCount =
                      ord.items_count !== undefined
                        ? ord.items_count
                        : ord.items
                        ? ord.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                        : 1;

                    return (
                      <tr
                        key={ord.id}
                        className={`ao-row ${isSelected ? "ao-row--selected" : ""}`}
                        onClick={() => handleViewOrder(ord)}
                      >
                        {/* Order Number */}
                        <td>
                          <div className="ao-order-num-cell">
                            {isSelected && <span className="ao-row-active-dot" />}
                            <span
                              className={`ao-order-num ${
                                isSelected ? "ao-order-num--selected" : ""
                              }`}
                            >
                              {ord.order_number}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <span className="ao-customer-name" title={ord.customer_name || ord.user}>
                            {ord.customer_name || (ord.user ? `User #${ord.user}` : "Guest")}
                          </span>
                        </td>

                        {/* Date */}
                        <td>
                          <span className="ao-date-text">{formatDate(ord.created_at)}</span>
                        </td>

                        {/* Items */}
                        <td>
                          <span className="ao-items-pill">{itemsCount}</span>
                        </td>

                        {/* Total */}
                        <td>
                          <span className="ao-total-text">
                            {formatCurrency(ord.total_amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`ao-status-badge ${getStatusBadgeClass(ord.status)}`}
                          >
                            {formatStatusLabel(ord.status)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="ao-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="ao-icon-btn"
                              title="View Order Details"
                              onClick={() => handleViewOrder(ord)}
                              aria-label={`View details for order ${ord.order_number}`}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination (Figma) ─────────────────────────────────── */}
          {!loading && !error && orders.length > 0 && (
            <div className="ao-pagination">
              <span className="ao-pagination-info">
                Showing <strong className="ao-white-text">{rangeStart}</strong> to{" "}
                <strong className="ao-white-text">{rangeEnd}</strong> of{" "}
                <strong className="ao-white-text">{totalCount}</strong> results
              </span>

              <div className="ao-pagination-controls">
                <button
                  className="ao-page-nav-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`ao-page-num-btn ${
                      pageNum === currentPage ? "ao-page-num-btn--active" : ""
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  className="ao-page-nav-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Order Detail Drawer (Figma Side Panel) ─────────────────── */}
      {selectedOrder && (
        <aside className="ao-drawer" aria-label="Order Details Panel">
          {/* Drawer Header */}
          <div className="ao-drawer-header">
            <div className="ao-drawer-title-wrap">
              <h2 className="ao-drawer-title">ORDER DETAILS</h2>
              <span className="ao-drawer-title-dot" />
            </div>
            <button
              className="ao-drawer-close"
              onClick={handleCloseDrawer}
              aria-label="Close details drawer"
            >
              ✕
            </button>
          </div>

          <div className="ao-drawer-body">
            {drawerLoading ? (
              <div className="ao-drawer-loading">
                <div className="ao-spinner"></div>
                <p>Loading order details...</p>
              </div>
            ) : (
              <>
                {/* Order ID & Status Header Card */}
                <div className="ao-drawer-order-banner">
                  <div className="ao-drawer-order-id-line">
                    <span className="ao-drawer-label">ORDER ID</span>
                    <span className="ao-drawer-order-number">
                      {selectedOrder.order_number}
                    </span>
                  </div>

                  {/* Status Indicator & Live Status Changer */}
                  <div className="ao-status-change-wrap">
                    <div className="ao-status-current-badge">
                      <span className={`ao-status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                        {formatStatusLabel(selectedOrder.status)}
                      </span>
                    </div>

                    <div className="ao-status-select-container">
                      <label htmlFor="update-status-select" className="ao-status-change-label">
                        Update Status:
                      </label>
                      <select
                        id="update-status-select"
                        className="ao-status-select"
                        value={selectedOrder.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 1: Customer Information */}
                <div className="ao-drawer-section">
                  <h3 className="ao-section-title">CUSTOMER INFORMATION</h3>
                  <div className="ao-info-card">
                    {/* Customer Name */}
                    <div className="ao-info-row">
                      <div className="ao-info-icon-box">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="ao-info-text-group">
                        <span className="ao-info-sublabel">NAME</span>
                        <span className="ao-info-value">
                          {selectedOrder.customer_name || "Guest Customer"}
                        </span>
                      </div>
                    </div>

                    {/* Customer Email */}
                    <div className="ao-info-row">
                      <div className="ao-info-icon-box">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                      <div className="ao-info-text-group">
                        <span className="ao-info-sublabel">EMAIL</span>
                        <span className="ao-info-value">
                          {selectedOrder.customer_email || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Customer Phone */}
                    <div className="ao-info-row">
                      <div className="ao-info-icon-box">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <div className="ao-info-text-group">
                        <span className="ao-info-sublabel">PHONE</span>
                        <span className="ao-info-value">
                          {selectedOrder.customer_phone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Order Items */}
                <div className="ao-drawer-section">
                  <div className="ao-section-header-row">
                    <h3 className="ao-section-title">ORDER ITEMS</h3>
                    <span className="ao-skus-badge">
                      {selectedOrder.items?.length || 0} unique SKU
                      {selectedOrder.items?.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="ao-items-list">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item) => (
                        <div key={item.id} className="ao-item-card">
                          <div className="ao-item-icon-box">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
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
                          <div className="ao-item-info">
                            <h4 className="ao-item-title">{item.product_name}</h4>
                            <p className="ao-item-variant">
                              {item.variant_name || item.sku}
                            </p>
                            <span className="ao-item-qty">
                              Qty: {item.quantity}{" "}
                              <span className="ao-item-unit-price">
                                ({formatCurrency(item.unit_price)} each)
                              </span>
                            </span>
                          </div>
                          <div className="ao-item-total">
                            {formatCurrency(item.total_amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="ao-empty-items-notice">No line items in this order.</p>
                    )}
                  </div>
                </div>

                {/* Section 3: Order Summary */}
                <div className="ao-drawer-section">
                  <h3 className="ao-section-title">ORDER SUMMARY</h3>
                  <div className="ao-info-card">
                    <div className="ao-summary-line">
                      <span className="ao-summary-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Order Date
                      </span>
                      <span className="ao-summary-val">{formatDate(selectedOrder.created_at)}</span>
                    </div>

                    <div className="ao-summary-line">
                      <span className="ao-summary-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                        Total Items
                      </span>
                      <span className="ao-summary-val">
                        {selectedOrder.items_count !== undefined
                          ? selectedOrder.items_count
                          : selectedOrder.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0}{" "}
                        Items
                      </span>
                    </div>

                    <div className="ao-summary-line">
                      <span className="ao-summary-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        Payment Status
                      </span>
                      <span className="ao-summary-val ao-capitalize">
                        {selectedOrder.payment_status || "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Shipping Details */}
                <div className="ao-drawer-section">
                  <h3 className="ao-section-title">SHIPPING DETAILS</h3>
                  <div className="ao-info-card">
                    <div className="ao-info-row">
                      <div className="ao-info-icon-box">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div className="ao-info-text-group">
                        <span className="ao-info-sublabel">SHIPPING ADDRESS</span>
                        <span className="ao-info-value">
                          {selectedOrder.shipping_address ? (
                            <>
                              {selectedOrder.shipping_address.address_line1}
                              {selectedOrder.shipping_address.address_line2
                                ? `, ${selectedOrder.shipping_address.address_line2}`
                                : ""}
                              <br />
                              {selectedOrder.shipping_address.city}
                              {selectedOrder.shipping_address.state
                                ? `, ${selectedOrder.shipping_address.state}`
                                : ""}{" "}
                              {selectedOrder.shipping_address.postal_code || ""}
                              {selectedOrder.shipping_address.country
                                ? `, ${selectedOrder.shipping_address.country}`
                                : ""}
                            </>
                          ) : (
                            "Standard Ground Fulfillment"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5: Financial Breakdown & Grand Total */}
                <div className="ao-drawer-financials">
                  <div className="ao-fin-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>

                  {parseFloat(selectedOrder.discount_amount) > 0 && (
                    <div className="ao-fin-row ao-fin-row--discount">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                    </div>
                  )}

                  {parseFloat(selectedOrder.shipping_amount) > 0 && (
                    <div className="ao-fin-row">
                      <span>Shipping</span>
                      <span>{formatCurrency(selectedOrder.shipping_amount)}</span>
                    </div>
                  )}

                  <div className="ao-fin-row">
                    <span>Tax</span>
                    <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                  </div>

                  <div className="ao-total-row">
                    <div>
                      <span className="ao-total-label">TOTAL AMOUNT</span>
                      <span className="ao-usd-caption">USD Included</span>
                    </div>
                    <span className="ao-total-amount">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
