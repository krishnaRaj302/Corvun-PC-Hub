import { useState, useEffect, useCallback } from "react";
import { getAdminPayments } from "../../services/adminPaymentService";
import { useNavigate } from "react-router-dom";
import "./AdminPayments.css";

/* ─── helpers ─────────────────────────────────────────────── */
const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toISOString().split("T")[0]; }
  catch { return d; }
};

const getStatusClass = (s) => {
  switch ((s || "").toLowerCase()) {
    case "completed": case "success": case "paid": return "ap-badge--completed";
    case "pending":   return "ap-badge--pending";
    case "failed":    case "cancelled": return "ap-badge--failed";
    case "refunded":  return "ap-badge--refunded";
    default:          return "ap-badge--pending";
  }
};

const capitalize = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const PAGE_SIZE = 10;

/* ─── KPI Card ─────────────────────────────────────────────── */
function KpiCard({ label, value, icon, accent }) {
  return (
    <div className="ap-kpi-card">
      <div className="ap-kpi-body">
        <span className="ap-kpi-label">{label}</span>
        <span className="ap-kpi-value">{value}</span>
      </div>
      <div className={`ap-kpi-icon ap-kpi-icon--${accent}`}>{icon}</div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function AdminPayments() {
  const navigate = useNavigate();

  /* state */
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    total_transactions: 0,
    total_revenue: 0,
    total_refunds: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* fetch */
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: currentPage, page_size: PAGE_SIZE, paginate: true };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const data = await getAdminPayments(params);

      const results = data.results || data.payments || (Array.isArray(data) ? data : []);
      setPayments(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);

      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("AdminPayments fetch error:", err);
      setError("Unable to load payment data. Verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  /* pagination */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="ap-page">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="ap-header">
        <div>
          <h1 className="ap-title">Payments</h1>
          <p className="ap-subtitle">Manage payment transactions</p>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="ap-kpi-row">
        <KpiCard
          label="Total Transactions"
          value={loading ? "—" : stats.total_transactions.toLocaleString()}
          accent="blue"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          }
        />
        <KpiCard
          label="Revenue"
          value={loading ? "—" : formatCurrency(stats.total_revenue)}
          accent="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
        />
        <KpiCard
          label="Refunds"
          value={loading ? "—" : formatCurrency(stats.total_refunds)}
          accent="red"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
            </svg>
          }
        />
      </div>

      {/* ── View Refund Details link ─────────────────────────── */}
      <div className="ap-refund-nav">
        <button
          className="ap-refund-link"
          onClick={() => navigate("/admin/payments/refunds")}
          id="view-refund-details-btn"
        >
          View Refund Details
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="ap-filter-bar">
        <div className="ap-search-wrap">
          <svg className="ap-search-icon" width="15" height="15"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="payment-search-input"
            type="text"
            className="ap-search-input"
            placeholder="Search by order, customer, or method…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="ap-select-wrap">
          <select
            id="payment-status-filter"
            className="ap-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────── */}
      <div className="ap-card">
        {loading ? (
          <div className="ap-loading">
            <div className="ap-spinner"/>
            <p className="ap-loading-text">Loading payment records…</p>
          </div>
        ) : error ? (
          <div className="ap-empty ap-empty--error">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div className="ap-empty-title">Error Loading Payments</div>
            <div className="ap-empty-desc">{error}</div>
            <button className="ap-retry-btn" onClick={fetchPayments}>Retry</button>
          </div>
        ) : payments.length === 0 ? (
          <div className="ap-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <div className="ap-empty-title">No payments found.</div>
            <div className="ap-empty-desc">
              {search || statusFilter !== "all"
                ? "No payment records match your current filters."
                : "When customers complete checkout and payment, transactions will appear here."}
            </div>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>PAYMENT ID</th>
                  <th>ORDER ID</th>
                  <th>CUSTOMER</th>
                  <th>AMOUNT</th>
                  <th>PAYMENT METHOD</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="ap-row">
                    <td>
                      <span className="ap-pay-id">{p.payment_id_display || `PAY-${p.id}`}</span>
                    </td>
                    <td>
                      <span className="ap-order-id">{p.order_number}</span>
                    </td>
                    <td>
                      <div className="ap-customer">
                        <span className="ap-customer-name">{p.customer_name || "—"}</span>
                        {p.customer_email && (
                          <span className="ap-customer-email">{p.customer_email}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="ap-amount">{formatCurrency(p.amount)}</span>
                    </td>
                    <td>
                      <span className="ap-method">{capitalize(p.payment_method)}</span>
                    </td>
                    <td>
                      <span className={`ap-badge ${getStatusClass(p.status)}`}>
                        {capitalize(p.status)}
                      </span>
                    </td>
                    <td>
                      <span className="ap-date">{formatDate(p.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && payments.length > 0 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              Showing <strong className="ap-white">{rangeStart}</strong> to{" "}
              <strong className="ap-white">{rangeEnd}</strong> of{" "}
              <strong className="ap-white">{totalCount}</strong> results
            </span>
            <div className="ap-pagination-controls">
              <button
                className="ap-page-nav"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous page"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`ap-page-num ${n === currentPage ? "ap-page-num--active" : ""}`}
                  onClick={() => setCurrentPage(n)}
                >{n}</button>
              ))}
              <button
                className="ap-page-nav"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                aria-label="Next page"
              >›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
