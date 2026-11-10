import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdminReviews, exportAdminReviewsCSV } from "../../services/adminReviewService";
import "./AdminReviews.css";

/* ─── Helpers ──────────────────────────────────────────────── */
const renderStars = (rating) => {
  const stars = [];
  const r = Math.round(Number(rating) || 0);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <svg
        key={i}
        className={`rm-star ${i <= r ? "rm-star--filled" : "rm-star--empty"}`}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={i <= r ? "#f59e0b" : "none"}
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  return stars;
};

const getStatusBadge = (status) => {
  const s = (status || "pending").toLowerCase();
  switch (s) {
    case "approved":
      return <span className="rm-badge rm-badge--approved">Approved</span>;
    case "reported":
      return <span className="rm-badge rm-badge--reported">Reported</span>;
    case "rejected":
      return <span className="rm-badge rm-badge--rejected">Rejected</span>;
    case "pending":
    default:
      return <span className="rm-badge rm-badge--pending">Pending</span>;
  }
};

const getInitials = (name) => {
  if (!name || name === "—" || name === "Anonymous") return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const PAGE_SIZE = 10;

export default function AdminReviews() {
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────────────── */
  const [reviews, setReviews] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [stats, setStats] = useState({
    total_reviews: 0,
    average_rating: 0.0,
    pending_reviews: 0,
    reported_reviews: 0,
    reviews_trend: "0% from last month",
    reviews_trend_positive: true,
    rating_trend: "+0.0 from last month",
    rating_trend_positive: true,
    pending_label: "All caught up",
    reported_label: "No active reports",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ── Auto-dismiss toast ────────────────────────────────────── */
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

  /* ── Fetch Reviews ─────────────────────────────────────────── */
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        page_size: PAGE_SIZE,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (ratingFilter && ratingFilter !== "all") params.rating = ratingFilter;

      const data = await getAdminReviews(params);
      setReviews(data.reviews || []);
      setTotalCount(data.count !== undefined ? data.count : 0);
      setTotalPages(data.total_pages || 1);

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch reviews error:", err);
      setError(
        err.response?.data?.error || "Failed to load reviews from PostgreSQL database."
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ── Search & Filter Handlers ────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleRatingFilterChange = (e) => {
    setRatingFilter(e.target.value);
    setCurrentPage(1);
  };

  /* ── CSV Export Handler ──────────────────────────────────── */
  const handleExport = async () => {
    if (totalCount === 0) {
      showToast("No reviews found in database to export.", "error");
      return;
    }
    setExporting(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (ratingFilter && ratingFilter !== "all") params.rating = ratingFilter;

      await exportAdminReviewsCSV(params);
      showToast("Reviews successfully exported to CSV.", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export reviews.", "error");
    } finally {
      setExporting(false);
    }
  };

  /* ── Pagination Boundaries ─────────────────────────────────── */
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="rm-page">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toast.show && (
        <div className={`rm-toast rm-toast--${toast.type}`}>
          <div className="rm-toast-content">
            <span className="rm-toast-indicator" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="rm-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="rm-header">
        <div className="rm-header-left">
          <h1 className="rm-title">Review Management</h1>
          <p className="rm-subtitle">
            Manage customer reviews, benchmark feedback, and hardware moderation.
          </p>
        </div>
        <div className="rm-header-right">
          <button
            type="button"
            className="rm-export-btn"
            onClick={handleExport}
            disabled={exporting}
            id="rm-export-btn"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exporting..." : "Export Reviews"}
          </button>
        </div>
      </div>

      {/* ── Overview KPI Section (Exact 4 Cards) ──────────────── */}
      <div className="rm-kpi-grid">
        {/* Card 1: Total Reviews */}
        <div className="rm-kpi-card">
          <div className="rm-kpi-info">
            <span className="rm-kpi-label">Total Reviews</span>
            <span className="rm-kpi-value">
              {stats.total_reviews.toLocaleString("en-IN")}
            </span>
            <span
              className={`rm-kpi-trend ${
                stats.reviews_trend_positive
                  ? "rm-kpi-trend--positive"
                  : "rm-kpi-trend--negative"
              }`}
            >
              {stats.reviews_trend}
            </span>
          </div>
          <div className="rm-kpi-icon rm-kpi-icon--blue">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>

        {/* Card 2: Average Rating */}
        <div className="rm-kpi-card">
          <div className="rm-kpi-info">
            <span className="rm-kpi-label">Average Rating</span>
            <span className="rm-kpi-value">
              {Number(stats.average_rating).toFixed(1)}
            </span>
            <span
              className={`rm-kpi-trend ${
                stats.rating_trend_positive
                  ? "rm-kpi-trend--positive"
                  : "rm-kpi-trend--negative"
              }`}
            >
              {stats.rating_trend}
            </span>
          </div>
          <div className="rm-kpi-icon rm-kpi-icon--gold">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#f59e0b"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        {/* Card 3: Pending Reviews */}
        <div className="rm-kpi-card">
          <div className="rm-kpi-info">
            <span className="rm-kpi-label">Pending Reviews</span>
            <span className="rm-kpi-value">
              {stats.pending_reviews.toLocaleString("en-IN")}
            </span>
            <span className="rm-kpi-trend rm-kpi-trend--warning">
              {stats.pending_label}
            </span>
          </div>
          <div className="rm-kpi-icon rm-kpi-icon--amber">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        {/* Card 4: Reported Reviews */}
        <div className="rm-kpi-card">
          <div className="rm-kpi-info">
            <span className="rm-kpi-label">Reported Reviews</span>
            <span className="rm-kpi-value">
              {stats.reported_reviews.toLocaleString("en-IN")}
            </span>
            <span className="rm-kpi-trend rm-kpi-trend--danger">
              {stats.reported_label}
            </span>
          </div>
          <div className="rm-kpi-icon rm-kpi-icon--red">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="rm-error-banner">
          <svg
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
          <span>{error}</span>
          <button
            type="button"
            className="rm-retry-btn"
            onClick={fetchReviews}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div className="rm-filter-bar">
        <div className="rm-search-wrap">
          <svg
            className="rm-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="review-search-input"
            type="text"
            className="rm-search-input"
            placeholder="Search by user, product, or review text…"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="rm-select-group">
          {/* Status Filter */}
          <div className="rm-select-wrap">
            <select
              id="review-status-filter"
              className="rm-select"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="reported">Reported</option>
              <option value="rejected">Rejected</option>
            </select>
            <svg
              className="rm-select-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Rating Filter */}
          <div className="rm-select-wrap">
            <select
              id="review-rating-filter"
              className="rm-select"
              value={ratingFilter}
              onChange={handleRatingFilterChange}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <svg
              className="rm-select-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── All Reviews Table Section ───────────────────────────── */}
      <div className="rm-card">
        <div className="rm-card-header">
          <h2 className="rm-card-title">All Reviews</h2>
        </div>

        {loading ? (
          <div className="rm-loading">
            <div className="rm-spinner" />
            <p className="rm-loading-text">Loading reviews from database…</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rm-empty">
            <svg
              className="rm-empty-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <div className="rm-empty-title">No reviews found.</div>
            <div className="rm-empty-desc">
              {search || statusFilter !== "all" || ratingFilter !== "all"
                ? "No reviews match your current search or filter criteria."
                : "When customers submit product reviews, they will appear here."}
            </div>
          </div>
        ) : (
          <div className="rm-table-wrap">
            <table className="rm-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>PRODUCT</th>
                  <th>RATING</th>
                  <th>REVIEW</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => {
                  const userName = rev.user_name || "Anonymous";
                  const userEmail = rev.user_email || "—";
                  const productName = rev.product_name || "—";
                  const ratingNum = Number(rev.rating).toFixed(1);

                  return (
                    <tr
                      key={rev.id}
                      className="rm-table-row"
                      onClick={() => navigate(`/admin/reviews/${rev.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") navigate(`/admin/reviews/${rev.id}`);
                      }}
                    >
                      {/* USER Column */}
                      <td className="rm-user-cell">
                        <div className="rm-user-flex">
                          <div className="rm-user-avatar">
                            {getInitials(userName)}
                          </div>
                          <div className="rm-user-meta">
                            <span className="rm-user-name">{userName}</span>
                            <span className="rm-user-email">{userEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* PRODUCT Column */}
                      <td className="rm-product-cell">
                        <span className="rm-product-name">{productName}</span>
                      </td>

                      {/* RATING Column */}
                      <td className="rm-rating-cell">
                        <div className="rm-stars-flex">
                          <div className="rm-stars-wrap">
                            {renderStars(rev.rating)}
                          </div>
                          <span className="rm-rating-num">{ratingNum}</span>
                        </div>
                      </td>

                      {/* REVIEW Column */}
                      <td className="rm-review-cell">
                        <div className="rm-review-text-wrap">
                          {rev.title && (
                            <div className="rm-review-title">{rev.title}</div>
                          )}
                          <div className="rm-review-comment">
                            {rev.comment}
                          </div>
                        </div>
                      </td>

                      {/* STATUS Column */}
                      <td className="rm-status-cell">
                        {getStatusBadge(rev.status)}
                      </td>

                      {/* ACTION Column */}
                      <td
                        className="rm-action-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          to={`/admin/reviews/${rev.id}`}
                          className="rm-action-link"
                          title="View review details"
                        >
                          <span>Moderate</span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination (Exact Figma Layout) ──────────────────── */}
        <div className="rm-pagination">
          <div className="rm-pagination-left">
            Showing {startIdx} to {endIdx} of {totalCount} results
          </div>
          <div className="rm-pagination-right">
            <button
              type="button"
              className="rm-page-btn"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="rm-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="rm-page-btn"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
