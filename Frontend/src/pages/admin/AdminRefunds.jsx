import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminRefunds,
  getAdminRefundDetail,
  updateRefundStatus,
} from "../../services/adminRefundService";
import "./AdminRefunds.css";

/* ─── Helpers ──────────────────────────────────────────────── */
const formatCurrency = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "₹0.00";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toISOString().split("T")[0]; }
  catch { return d; }
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const getStatusClass = (s) => {
  switch ((s || "").toLowerCase()) {
    case "approved":  return "ar-badge--approved";
    case "processed": return "ar-badge--processed";
    case "rejected":  return "ar-badge--rejected";
    case "pending":
    default:          return "ar-badge--pending";
  }
};

/* ─── Refund Detail Modal ──────────────────────────────────── */
function RefundDetailModal({ refundId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAdminRefundDetail(refundId)
      .then((data) => { if (active) setDetail(data.refund); })
      .catch(() => { if (active) setError("Failed to load refund details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refundId]);

  return (
    <div className="ar-modal-backdrop" onClick={onClose}>
      <div className="ar-modal" onClick={(e) => e.stopPropagation()} role="dialog"
        aria-modal="true" aria-label="Refund Details">

        {/* Modal Header */}
        <div className="ar-modal-header">
          <div>
            <h2 className="ar-modal-title">Refund Details</h2>
            {detail && (
              <span className="ar-modal-refund-id">
                Refund ID: <code className="ar-ref-code">{detail.refund_id_display}</code>
              </span>
            )}
          </div>
          <button className="ar-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ar-modal-body">
          {loading ? (
            <div className="ar-modal-loading">
              <div className="ar-spinner" />
              <p>Loading refund details…</p>
            </div>
          ) : error ? (
            <div className="ar-modal-error">{error}</div>
          ) : detail ? (
            <>
              {/* Customer Information */}
              <section className="ar-modal-section">
                <div className="ar-section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  CUSTOMER INFORMATION
                </div>
                <div className="ar-info-grid">
                  <div className="ar-info-item">
                    <span className="ar-info-label">NAME</span>
                    <span className="ar-info-value">{detail.customer?.name || "—"}</span>
                  </div>
                  <div className="ar-info-item">
                    <span className="ar-info-label">EMAIL</span>
                    <span className="ar-info-value">{detail.customer?.email || "—"}</span>
                  </div>
                  {detail.customer?.phone && (
                    <div className="ar-info-item">
                      <span className="ar-info-label">PHONE</span>
                      <span className="ar-info-value">{detail.customer.phone}</span>
                    </div>
                  )}
                  {detail.shipping_address && (
                    <div className="ar-info-item ar-info-item--full">
                      <span className="ar-info-label">ADDRESS</span>
                      <span className="ar-info-value">
                        {detail.shipping_address.address_line1}
                        {detail.shipping_address.address_line2
                          ? `, ${detail.shipping_address.address_line2}` : ""},&nbsp;
                        {detail.shipping_address.city}, {detail.shipping_address.state}&nbsp;
                        {detail.shipping_address.postal_code}, {detail.shipping_address.country}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Payment Information */}
              <section className="ar-modal-section">
                <div className="ar-section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  PAYMENT INFORMATION
                </div>
                <div className="ar-info-grid">
                  <div className="ar-info-item">
                    <span className="ar-info-label">METHOD</span>
                    <span className="ar-info-value">{capitalize(detail.payment?.method)}</span>
                  </div>
                  <div className="ar-info-item">
                    <span className="ar-info-label">PAYMENT AMOUNT</span>
                    <span className="ar-info-value">{formatCurrency(detail.payment?.amount)}</span>
                  </div>
                  <div className="ar-info-item">
                    <span className="ar-info-label">PAYMENT STATUS</span>
                    <span className="ar-info-value ar-capitalize">{detail.payment?.status || "—"}</span>
                  </div>
                  <div className="ar-info-item">
                    <span className="ar-info-label">REFUND REASON</span>
                    <span className="ar-info-value">{detail.reason || "—"}</span>
                  </div>
                </div>
              </section>

              {/* Order Details */}
              <section className="ar-modal-section">
                <div className="ar-section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  ORDER DETAILS
                </div>
                <div className="ar-order-meta">
                  <div className="ar-order-meta-item">
                    <span className="ar-info-label">ORDER ID</span>
                    <span className="ar-order-num">{detail.order?.order_number || "—"}</span>
                  </div>
                  <div className="ar-order-meta-item">
                    <span className="ar-info-label">ORDER DATE</span>
                    <span className="ar-info-value">{formatDate(detail.order?.created_at)}</span>
                  </div>
                  <div className="ar-order-meta-item">
                    <span className="ar-info-label">ITEMS</span>
                    <span className="ar-info-value">{detail.order?.items?.length ?? 0}</span>
                  </div>
                  <div className="ar-order-meta-item">
                    <span className="ar-info-label">TOTAL AMOUNT</span>
                    <span className="ar-info-value">{formatCurrency(detail.order?.total_amount)}</span>
                  </div>
                </div>

                {/* Items table */}
                {detail.order?.items?.length > 0 && (
                  <div className="ar-items-table-wrap">
                    <table className="ar-items-table">
                      <thead>
                        <tr>
                          <th>PRODUCT</th>
                          <th>QUANTITY</th>
                          <th>PRICE</th>
                          <th>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.order.items.map((item, i) => (
                          <tr key={i}>
                            <td>
                              <div className="ar-item-name">{item.product_name}</div>
                              {item.variant_name && (
                                <div className="ar-item-variant">{item.variant_name}</div>
                              )}
                            </td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>{formatCurrency(item.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Order totals */}
                <div className="ar-order-totals">
                  <div className="ar-total-line">
                    <span>Subtotal</span>
                    <span>{formatCurrency(detail.order?.subtotal)}</span>
                  </div>
                  <div className="ar-total-line">
                    <span>Shipping</span>
                    <span>{formatCurrency(detail.order?.shipping_amount)}</span>
                  </div>
                  <div className="ar-total-line">
                    <span>Tax</span>
                    <span>{formatCurrency(detail.order?.tax_amount)}</span>
                  </div>
                  <div className="ar-total-line ar-total-line--grand">
                    <span>Total</span>
                    <span className="ar-grand-total">{formatCurrency(detail.order?.total_amount)}</span>
                  </div>
                </div>
              </section>

              {/* Refund Amount */}
              <div className="ar-modal-refund-amount">
                <span className="ar-refund-label">REFUND AMOUNT</span>
                <span className="ar-refund-value">{formatCurrency(detail.amount)}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page Component ──────────────────────────────────── */
export default function AdminRefunds() {
  const navigate = useNavigate();

  const [refunds, setRefunds]   = useState([]);
  const [summary, setSummary]   = useState({
    total_refunds: 0,
    pending_refunds: 0,
    approved_processed: 0,
    total_refund_amount: 0,
  });
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [toast, setToast]           = useState({ show: false, msg: "", type: "success" });

  // Modal
  const [modalRefundId, setModalRefundId] = useState(null);

  // Status update
  const [updatingId, setUpdatingId] = useState(null);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 4000);
    return () => clearTimeout(t);
  }, [toast.show]);

  const showToast = (msg, type = "success") => setToast({ show: true, msg, type });

  /* Fetch refunds */
  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const data = await getAdminRefunds(params);
      setRefunds(data.refunds || []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error("AdminRefunds fetch error:", err);
      setError("Unable to load refund data. Verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  /* Status update handler */
  const handleStatusUpdate = async (refundId, newStatus) => {
    setUpdatingId(refundId);
    try {
      await updateRefundStatus(refundId, newStatus);
      showToast(`Refund status updated to ${newStatus}.`);
      fetchRefunds();
    } catch (err) {
      showToast(err?.response?.data?.error || "Failed to update refund status.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="ar-page">

      {/* Toast */}
      {toast.show && (
        <div className={`ar-toast ${toast.type === "error" ? "ar-toast--error" : ""}`}>
          <div className="ar-toast-content">
            <span className="ar-toast-dot" />
            <span>{toast.msg}</span>
          </div>
          <button className="ar-toast-close"
            onClick={() => setToast({ show: false, msg: "", type: "success" })} aria-label="Close">✕</button>
        </div>
      )}

      {/* Modal */}
      {modalRefundId && (
        <RefundDetailModal
          refundId={modalRefundId}
          onClose={() => setModalRefundId(null)}
        />
      )}

      {/* ── Back to Payments ──────────────────────────────── */}
      <button className="ar-back-btn" onClick={() => navigate("/admin/payments")} id="back-to-payments-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Payments
      </button>

      {/* ── Header ───────────────────────────────────────── */}
      <div className="ar-header">
        <div>
          <h1 className="ar-title">Refund Management</h1>
          <p className="ar-subtitle">Track and manage customer refund requests</p>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────── */}
      <div className="ar-filter-bar">
        <div className="ar-search-wrap">
          <svg className="ar-search-icon" width="15" height="15"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="refund-search-input"
            type="text"
            className="ar-search-input"
            placeholder="Search refunds by ID, order, or customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
          />
        </div>

        <div className="ar-select-wrap">
          <select id="refund-status-filter" className="ar-select"
            value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Export button — visual only, no fake functionality */}
        <button className="ar-export-btn" disabled title="Export not yet implemented">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      {/* ── Info Banner ──────────────────────────────────── */}
      <div className="ar-info-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="ar-info-text">
          <strong>Refunds are managed through the payment gateway.</strong> Approve a refund to
          initiate processing through the gateway configured for each payment. Manage refunds
          directly from your payment dashboard for real-time status.
        </p>
      </div>

      {/* ── Refund Table ─────────────────────────────────── */}
      <div className="ar-card">
        {loading ? (
          <div className="ar-loading">
            <div className="ar-spinner"/>
            <p className="ar-loading-text">Loading refund records…</p>
          </div>
        ) : error ? (
          <div className="ar-empty ar-empty--error">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div className="ar-empty-title">Error Loading Refunds</div>
            <div className="ar-empty-desc">{error}</div>
            <button className="ar-retry-btn" onClick={fetchRefunds}>Retry</button>
          </div>
        ) : refunds.length === 0 ? (
          <div className="ar-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
            </svg>
            <div className="ar-empty-title">No refunds found.</div>
            <div className="ar-empty-desc">
              {search || statusFilter !== "all"
                ? "No refund records match your current filters."
                : "When customers submit refund requests, they will appear here."}
            </div>
          </div>
        ) : (
          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>REFUND ID</th>
                  <th>ORDER ID</th>
                  <th>CUSTOMER</th>
                  <th>AMOUNT</th>
                  <th>DATE</th>
                  <th>PAYMENT METHOD</th>
                  <th>STATUS</th>
                  <th className="ar-th-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="ar-row">
                    <td><span className="ar-ref-id">{r.refund_id_display}</span></td>
                    <td><span className="ar-order-id">{r.order_number}</span></td>
                    <td>
                      <div className="ar-customer">
                        <span className="ar-customer-name">{r.customer_name}</span>
                        {r.customer_email && (
                          <span className="ar-customer-email">{r.customer_email}</span>
                        )}
                      </div>
                    </td>
                    <td><span className="ar-amount">{formatCurrency(r.amount)}</span></td>
                    <td><span className="ar-date">{formatDate(r.created_at)}</span></td>
                    <td><span className="ar-method">{capitalize(r.gateway)}</span></td>
                    <td>
                      <span className={`ar-badge ${getStatusClass(r.status)}`}>
                        {capitalize(r.status)}
                      </span>
                    </td>
                    <td>
                      <div className="ar-actions">
                        {/* View detail */}
                        <button
                          className="ar-icon-btn ar-icon-btn--view"
                          title="View refund details"
                          onClick={() => setModalRefundId(r.id)}
                          aria-label={`View refund ${r.refund_id_display}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>

                        {/* Approve — only for pending */}
                        {r.status === "pending" && (
                          <button
                            className="ar-icon-btn ar-icon-btn--approve"
                            title="Approve refund"
                            disabled={updatingId === r.id}
                            onClick={() => handleStatusUpdate(r.id, "approved")}
                            aria-label={`Approve refund ${r.refund_id_display}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                        )}

                        {/* Reject — only for pending */}
                        {r.status === "pending" && (
                          <button
                            className="ar-icon-btn ar-icon-btn--reject"
                            title="Reject refund"
                            disabled={updatingId === r.id}
                            onClick={() => handleStatusUpdate(r.id, "rejected")}
                            aria-label={`Reject refund ${r.refund_id_display}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Refund Summary ───────────────────────────────── */}
      <div className="ar-summary-section">
        <h2 className="ar-summary-title">Refund Summary</h2>
        <div className="ar-summary-grid">
          <div className="ar-summary-card">
            <span className="ar-summary-label">Total Refunds</span>
            <span className="ar-summary-value">{summary.total_refunds}</span>
          </div>
          <div className="ar-summary-card">
            <span className="ar-summary-label">Pending Refunds</span>
            <span className="ar-summary-value ar-summary-value--yellow">{summary.pending_refunds}</span>
          </div>
          <div className="ar-summary-card">
            <span className="ar-summary-label">Approved / Processed</span>
            <span className="ar-summary-value ar-summary-value--green">{summary.approved_processed}</span>
          </div>
          <div className="ar-summary-card">
            <span className="ar-summary-label">Total Refund Amount</span>
            <span className="ar-summary-value">{formatCurrency(summary.total_refund_amount)}</span>
          </div>
        </div>
      </div>

      {/* ── Gateway Integration Section (Figma visual — no fake functionality) ── */}
      <div className="ar-gateway-section">
        <h3 className="ar-gateway-title">Payment Gateway Integration</h3>
        <p className="ar-gateway-desc">
          This refund management system uses your configured payment gateway. When you
          approve a refund, it will be queued for processing through the gateway API.
          Visit your payment dashboard for real-time refund status.
        </p>
        <div className="ar-gateway-actions">
          <button className="ar-gateway-btn ar-gateway-btn--primary" disabled
            title="Gateway dashboard integration not configured">
            View Payment Dashboard
          </button>
          <button className="ar-gateway-btn ar-gateway-btn--secondary" disabled
            title="Sync not yet implemented">
            Sync Refund Status
          </button>
        </div>
      </div>
    </div>
  );
}
