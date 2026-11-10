import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getAdminReviewDetail,
  updateAdminReview,
  deleteAdminReview,
} from "../../services/adminReviewService";
import "./AdminReviewDetails.css";

/* ─── Helpers ──────────────────────────────────────────────── */
const renderStars = (rating) => {
  const stars = [];
  const r = Math.round(Number(rating) || 0);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <svg
        key={i}
        className={`rd-star ${i <= r ? "rd-star--filled" : "rd-star--empty"}`}
        width="18"
        height="18"
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
      return <span className="rd-badge rd-badge--approved">Approved</span>;
    case "reported":
      return <span className="rd-badge rd-badge--reported">Reported</span>;
    case "rejected":
      return <span className="rd-badge rd-badge--rejected">Rejected</span>;
    case "pending":
    default:
      return <span className="rd-badge rd-badge--pending">Pending</span>;
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

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function AdminReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  /* ── Fetch Review Detail ───────────────────────────────────── */
  const fetchReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminReviewDetail(id);
      setReview(data.review);
      setNotes(data.review?.moderation_notes || "");
    } catch (err) {
      console.error("Fetch review detail error:", err);
      setError(
        err.response?.data?.error || "Failed to load review details from PostgreSQL."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  /* ── Status Moderation Actions ─────────────────────────────── */
  const handleStatusChange = async (newStatus) => {
    if (!review) return;
    setActionLoading(true);
    try {
      const res = await updateAdminReview(review.id, {
        status: newStatus,
        moderation_notes: notes,
      });
      setReview(res.review);
      showToast(`Review status updated to ${newStatus}.`, "success");
    } catch (err) {
      console.error("Update review status error:", err);
      showToast(
        err.response?.data?.error || "Failed to update review status.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Save Moderation Notes ─────────────────────────────────── */
  const handleSaveNotes = async () => {
    if (!review) return;
    setSavingNotes(true);
    try {
      const res = await updateAdminReview(review.id, {
        moderation_notes: notes,
      });
      setReview(res.review);
      showToast("Moderation notes saved.", "success");
    } catch (err) {
      console.error("Save notes error:", err);
      showToast("Failed to save moderation notes.", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  /* ── Delete Review ─────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!review) return;
    setActionLoading(true);
    try {
      await deleteAdminReview(review.id);
      showToast("Review deleted successfully.", "success");
      setTimeout(() => {
        navigate("/admin/reviews");
      }, 1000);
    } catch (err) {
      console.error("Delete review error:", err);
      showToast("Failed to delete review.", "error");
      setActionLoading(false);
    }
  };

  /* ── Helpfulness Calculation ───────────────────────────────── */
  const helpfulVotes = review?.helpful_votes || 0;
  const notHelpfulVotes = review?.not_helpful_votes || 0;
  const totalVotes = helpfulVotes + notHelpfulVotes;
  const helpfulRatio =
    totalVotes > 0 ? Math.round((helpfulVotes / totalVotes) * 100) : 0;

  const productDetails = review?.product_details;
  const productId = productDetails?.id || review?.product;

  return (
    <div className="rd-page">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toast.show && (
        <div className={`rd-toast rd-toast--${toast.type}`}>
          <div className="rd-toast-content">
            <span className="rd-toast-indicator" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="rd-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Navigation Back Link ───────────────────────────── */}
      <div className="rd-top-nav">
        <Link to="/admin/reviews" className="rd-back-link">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Review Details</span>
        </Link>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="rd-error-banner">
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
            className="rd-retry-btn"
            onClick={fetchReview}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="rd-loading-card">
          <div className="rd-spinner" />
          <p className="rd-loading-text">Loading review from PostgreSQL…</p>
        </div>
      ) : !review ? (
        <div className="rd-empty-card">
          <p>Review record not found.</p>
          <Link to="/admin/reviews" className="rd-back-btn">
            Return to Review Management
          </Link>
        </div>
      ) : (
        <div className="rd-layout-grid">
          {/* ══════════════════════════════════════════════════════
              LEFT / MAIN COLUMN
              ══════════════════════════════════════════════════════ */}
          <div className="rd-main-col">
            {/* ── Review Information Card ──────────────────────── */}
            <div className="rd-card">
              {/* Card Top: User Info & Status */}
              <div className="rd-card-top">
                <div className="rd-user-info">
                  <div className="rd-user-avatar">
                    {getInitials(review.user_name)}
                  </div>
                  <div className="rd-user-details">
                    <h3 className="rd-user-name">
                      {review.user_name || "Anonymous"}
                    </h3>
                    <p className="rd-user-email">
                      {review.user_email || "—"}
                    </p>
                  </div>
                </div>
                <div className="rd-status-wrap">
                  {getStatusBadge(review.status)}
                </div>
              </div>

              <div className="rd-divider" />

              {/* Rating Section */}
              <div className="rd-rating-section">
                <div className="rd-stars-wrap">
                  {renderStars(review.rating)}
                </div>
                <span className="rd-rating-number">
                  {Number(review.rating).toFixed(1)}
                </span>
                {review.is_edited && (
                  <span className="rd-edited-badge">Edited</span>
                )}
              </div>

              {/* Review Content */}
              <div className="rd-content-section">
                {review.title && (
                  <h4 className="rd-review-title">{review.title}</h4>
                )}
                <p className="rd-review-comment">{review.comment}</p>
              </div>

              {/* Review Attached Images (if any) */}
              {Array.isArray(review.images) && review.images.length > 0 && (
                <div className="rd-images-section">
                  <span className="rd-section-label">ATTACHED IMAGES</span>
                  <div className="rd-images-grid">
                    {review.images.map((imgUrl, idx) => (
                      <a
                        key={idx}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rd-image-thumb-link"
                      >
                        <img
                          src={imgUrl}
                          alt={`Review attachment ${idx + 1}`}
                          className="rd-image-thumb"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Metadata Date */}
              <div className="rd-meta-footer">
                <span className="rd-meta-date">
                  Reviewed on {formatDate(review.created_at)}
                </span>
                {review.updated_at && review.updated_at !== review.created_at && (
                  <span className="rd-meta-updated">
                    (Updated {formatDate(review.updated_at)})
                  </span>
                )}
              </div>
            </div>

            {/* ── Product Information Card ─────────────────────── */}
            <div className="rd-card">
              <div className="rd-card-header-sm">
                <span className="rd-card-eyebrow">PRODUCT INFORMATION</span>
              </div>

              <div className="rd-product-layout">
                <div className="rd-product-meta-block">
                  <h3 className="rd-product-title">
                    {productDetails?.product_name || review.product_name || "Product"}
                  </h3>

                  <div className="rd-product-specs-grid">
                    <div className="rd-spec-item">
                      <span className="rd-spec-label">SKU</span>
                      <span className="rd-spec-value">
                        {productDetails?.sku || "—"}
                      </span>
                    </div>

                    <div className="rd-spec-item">
                      <span className="rd-spec-label">CATEGORY</span>
                      <span className="rd-spec-value">
                        {productDetails?.category || "—"}
                      </span>
                    </div>

                    <div className="rd-spec-item">
                      <span className="rd-spec-label">BRAND</span>
                      <span className="rd-spec-value">
                        {productDetails?.brand || "—"}
                      </span>
                    </div>

                    <div className="rd-spec-item">
                      <span className="rd-spec-label">PRICE</span>
                      <span className="rd-spec-value">
                        {productDetails?.base_price
                          ? `₹${Number(productDetails.base_price).toLocaleString("en-IN")}`
                          : "—"}
                      </span>
                    </div>

                    <div className="rd-spec-item">
                      <span className="rd-spec-label">STOCK</span>
                      <span className="rd-spec-value">
                        {productDetails?.stock !== undefined
                          ? productDetails.stock > 0
                            ? `${productDetails.stock} units`
                            : "Out of Stock"
                          : "—"}
                      </span>
                    </div>

                    <div className="rd-spec-item">
                      <span className="rd-spec-label">STATUS</span>
                      <span className="rd-spec-value rd-spec-value--active">
                        {productDetails?.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Product Details Link (Real Route) */}
              <div className="rd-product-link-row">
                {productId ? (
                  <Link
                    to={`/admin/products/edit/${productId}`}
                    className="rd-view-product-btn"
                  >
                    <span>View Product Details</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ) : (
                  <span className="rd-view-product-btn rd-view-product-btn--disabled">
                    Product details unavailable
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              RIGHT COLUMN
              ══════════════════════════════════════════════════════ */}
          <div className="rd-side-col">
            {/* ── Moderation Actions Card ──────────────────────── */}
            <div className="rd-card">
              <h3 className="rd-side-title">Moderation Actions</h3>
              <p className="rd-side-subtitle">
                Set customer-facing moderation status for this review.
              </p>

              <div className="rd-actions-stack">
                {/* Approve Button */}
                <button
                  type="button"
                  className={`rd-btn-action rd-btn-approve ${
                    review.status === "approved" ? "rd-btn-action--current" : ""
                  }`}
                  onClick={() => handleStatusChange("approved")}
                  disabled={actionLoading}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    {review.status === "approved" ? "Review Approved" : "Approve Review"}
                  </span>
                </button>

                {/* Reject Button */}
                <button
                  type="button"
                  className={`rd-btn-action rd-btn-reject ${
                    review.status === "rejected" ? "rd-btn-action--current" : ""
                  }`}
                  onClick={() => handleStatusChange("rejected")}
                  disabled={actionLoading}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>
                    {review.status === "rejected" ? "Review Rejected" : "Reject Review"}
                  </span>
                </button>

                {/* Flag as Inappropriate Button */}
                <button
                  type="button"
                  className={`rd-btn-action rd-btn-flag ${
                    review.status === "reported" ? "rd-btn-action--current" : ""
                  }`}
                  onClick={() => handleStatusChange("reported")}
                  disabled={actionLoading}
                >
                  <svg
                    width="16"
                    height="16"
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
                  <span>
                    {review.status === "reported"
                      ? "Flagged as Inappropriate"
                      : "Flag as Inappropriate"}
                  </span>
                </button>
              </div>

              {/* Moderation Notes Field */}
              <div className="rd-notes-wrap">
                <label className="rd-notes-label">MODERATION NOTES</label>
                <textarea
                  className="rd-notes-textarea"
                  rows="3"
                  placeholder="Internal notes regarding moderation decision…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  type="button"
                  className="rd-notes-save-btn"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>

              {/* Destructive Delete Action */}
              <div className="rd-danger-zone">
                {showDeleteConfirm ? (
                  <div className="rd-delete-confirm-box">
                    <p className="rd-confirm-text">
                      Permanently delete this review from the database?
                    </p>
                    <div className="rd-confirm-actions">
                      <button
                        type="button"
                        className="rd-confirm-btn rd-confirm-btn--delete"
                        onClick={handleDelete}
                        disabled={actionLoading}
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        className="rd-confirm-btn rd-confirm-btn--cancel"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rd-delete-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Review Record
                  </button>
                )}
              </div>
            </div>

            {/* ── Review Statistics Card ───────────────────────── */}
            <div className="rd-card">
              <h3 className="rd-side-title">Review Statistics</h3>

              <div className="rd-stats-list">
                <div className="rd-stat-row">
                  <span className="rd-stat-label">Helpful votes</span>
                  <span className="rd-stat-value">{helpfulVotes}</span>
                </div>

                <div className="rd-stat-row">
                  <span className="rd-stat-label">Not helpful votes</span>
                  <span className="rd-stat-value">{notHelpfulVotes}</span>
                </div>

                <div className="rd-stat-row rd-stat-row--highlight">
                  <span className="rd-stat-label">Helpfulness ratio</span>
                  <span className="rd-stat-value rd-stat-value--accent">
                    {helpfulRatio}%
                  </span>
                </div>
              </div>

              {/* Visual Helpfulness Ratio Meter */}
              <div className="rd-ratio-meter">
                <div className="rd-ratio-bar">
                  <div
                    className="rd-ratio-fill"
                    style={{ width: `${helpfulRatio}%` }}
                  />
                </div>
                <div className="rd-ratio-meta">
                  <span>{totalVotes} total community interaction{totalVotes === 1 ? "" : "s"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
