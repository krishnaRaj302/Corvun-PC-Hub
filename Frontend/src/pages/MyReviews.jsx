import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccountSidebar from "../components/AccountSidebar";
import {
  getCustomerReviews,
  updateReview,
  deleteReview,
  submitReview,
} from "../services/reviewService";
import "./MyReviews.css";

// SVG Icons
const StarFilled = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#ff464b" stroke="#ff464b" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarEmpty = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ThumbsUpIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ATTRIBUTE_PRESETS = [
  "Sub-zero Thermals",
  "Silent Acoustics",
  "High FPS",
  "Great Value",
  "Power Efficient",
  "Easy Cable Routing",
];

export default function MyReviews() {
  const { user, isAuthenticated, authLoading } = useAuth();

  // Reviews Data State
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeTab, setActiveTab] = useState("all"); // "all" | "verified" | "pending" | "photos"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("recent"); // "recent" | "rating" | "helpful"

  // Modals
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({
    rating: 5,
    title: "",
    comment: "",
    attributes: [],
    recommend: true,
  });

  const [deletingReview, setDeletingReview] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    productName: "",
    categoryBadge: "GPU",
    rating: 5,
    title: "",
    comment: "",
    attributes: ["High FPS", "Great Value"],
    recommend: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ text: msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch Reviews
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomerReviews(user);
      setReviews(data);
    } catch (err) {
      console.error("Failed to fetch customer reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      Promise.resolve().then(() => {
        if (isMounted) fetchReviews();
      });
    } else if (!authLoading) {
      Promise.resolve().then(() => {
        if (isMounted) setLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading, fetchReviews]);

  // Statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg =
      total > 0
        ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / total).toFixed(1)
        : "5.0";
    const votes = reviews.reduce((acc, r) => acc + (Number(r.helpfulVotes) || 0), 0);
    const rewards = reviews.reduce((acc, r) => acc + (Number(r.rewardsPoints) || 50), 0);
    return { total, avg, votes, rewards };
  }, [reviews]);

  // Filter & Search
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (activeTab === "verified") {
      list = list.filter((r) => r.isVerifiedOwner && r.status === "approved");
    } else if (activeTab === "pending") {
      list = list.filter((r) => r.status === "pending");
    } else if (activeTab === "photos") {
      list = list.filter((r) => Array.isArray(r.images) && r.images.length > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.productName || "").toLowerCase().includes(q) ||
          (r.title || "").toLowerCase().includes(q) ||
          (r.comment || "").toLowerCase().includes(q) ||
          (r.categoryBadge || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortOrder === "rating") {
        return b.rating - a.rating;
      }
      if (sortOrder === "helpful") {
        return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [reviews, activeTab, searchQuery, sortOrder]);

  // Open Edit Modal
  const handleOpenEdit = (review) => {
    setEditingReview(review);
    setEditForm({
      rating: review.rating || 5,
      title: review.title || "",
      comment: review.comment || "",
      attributes: review.attributes || ["High FPS", "Great Value"],
      recommend: review.recommend !== false,
    });
  };

  // Submit Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReview) return;
    setIsSubmitting(true);

    try {
      const res = await updateReview(user, editingReview.id, editForm);
      showToast(res.message || "Review updated and pending moderation.");
      setEditingReview(null);
      fetchReviews();
    } catch (err) {
      console.error("Save edit error:", err);
      showToast("Failed to save changes. Please retry.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingReview) return;
    setIsSubmitting(true);

    try {
      const res = await deleteReview(user, deletingReview.id);
      showToast(res.message || "Review purged from verified ledger.");
      setDeletingReview(null);
      fetchReviews();
    } catch (err) {
      console.error("Delete review error:", err);
      showToast("Failed to purge review.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit New Hardware Review
  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!newForm.productName.trim() || !newForm.title.trim()) {
      showToast("Please provide product name and review title.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReview(user, newForm);
      showToast(res.message || "Review submitted for verification.");
      setIsNewModalOpen(false);
      setNewForm({
        productName: "",
        categoryBadge: "GPU",
        rating: 5,
        title: "",
        comment: "",
        attributes: ["High FPS", "Great Value"],
        recommend: true,
      });
      fetchReviews();
    } catch (err) {
      console.error("Create review error:", err);
      showToast("Failed to submit review.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Attribute Toggle Helper
  const toggleAttribute = (attr, isEdit = true) => {
    if (isEdit) {
      setEditForm((prev) => {
        const has = prev.attributes.includes(attr);
        return {
          ...prev,
          attributes: has ? prev.attributes.filter((a) => a !== attr) : [...prev.attributes, attr],
        };
      });
    } else {
      setNewForm((prev) => {
        const has = prev.attributes.includes(attr);
        return {
          ...prev,
          attributes: has ? prev.attributes.filter((a) => a !== attr) : [...prev.attributes, attr],
        };
      });
    }
  };

  // Format Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent Date";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Render Stars
  const renderStars = (rating) => {
    return (
      <div className="review-stars-row">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= rating ? <StarFilled key={star} /> : <StarEmpty key={star} />
        )}
      </div>
    );
  };

  return (
    <div className="reviews-page-wrapper">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`reviews-toast-banner ${toast.type}`} role="alert">
          <span className="toast-dot" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Breadcrumb & Page Header (Master CustomerProfile Reference) */}
      <div className="reviews-header-container">
        <nav className="reviews-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/profile" className="breadcrumb-link">My Account</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">My Reviews</span>
        </nav>

        <div className="reviews-title-row">
          <div>
            <span className="reviews-prefix-tag">
              CLIENT PERFORMANCE TELEMETRY // VERIFIED REVIEWS
            </span>
            <h1 className="reviews-headline">My Product Reviews</h1>
            <p className="reviews-subtitle">
              Manage your submitted ratings, verified purchase feedback, and build benchmarks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="reviews-primary-action-btn"
          >
            <PlusIcon />
            <span>Review New Hardware</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Workstation Layout */}
      <div className="reviews-workspace-grid">
        {/* Left Column: Shared Single Source Sidebar */}
        <AccountSidebar activeItem="reviews" />

        {/* Right Column: Reviews Content Area */}
        <main className="reviews-main-content">
          {/* KPI Summary Cards Row (Exact Match to Screenshot 1) */}
          <div className="reviews-kpi-grid">
            <div className="review-kpi-card">
              <span className="kpi-tag">TOTAL REVIEWS</span>
              <div className="kpi-num-row">
                <span className="kpi-big-num">{stats.total}</span>
                <span className="kpi-sub-text">PUBLISHED</span>
              </div>
            </div>

            <div className="review-kpi-card">
              <span className="kpi-tag">AVERAGE RATING</span>
              <div className="kpi-num-row">
                <span className="kpi-big-num star-rating-text">{stats.avg}</span>
                <span className="kpi-sub-text">/ 5.0</span>
              </div>
            </div>

            <div className="review-kpi-card">
              <span className="kpi-tag">HELPFUL VOTES</span>
              <div className="kpi-num-row">
                <span className="kpi-big-num">{stats.votes}</span>
                <span className="kpi-sub-text">RECEIVED</span>
              </div>
            </div>

            <div className="review-kpi-card">
              <span className="kpi-tag">REWARDS EARNED</span>
              <div className="kpi-num-row">
                <span className="kpi-big-num red-text">+{stats.rewards}</span>
                <span className="kpi-sub-text">PTS</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Filter Tabs, and Sort */}
          <div className="reviews-controls-card">
            <div className="reviews-search-box">
              <SearchIcon />
              <input
                type="text"
                placeholder="Filter by component name, serial, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="reviews-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="search-clear-btn"
                >
                  ×
                </button>
              )}
            </div>

            <div className="reviews-tabs-and-sort">
              <div className="reviews-tabs-bar">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`review-tab ${activeTab === "all" ? "active" : ""}`}
                >
                  All ({reviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("verified")}
                  className={`review-tab ${activeTab === "verified" ? "active" : ""}`}
                >
                  Verified ({reviews.filter((r) => r.isVerifiedOwner && r.status === "approved").length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pending")}
                  className={`review-tab ${activeTab === "pending" ? "active" : ""}`}
                >
                  Pending ({reviews.filter((r) => r.status === "pending").length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("photos")}
                  className={`review-tab ${activeTab === "photos" ? "active" : ""}`}
                >
                  With Rig Photos ({reviews.filter((r) => r.images?.length > 0).length})
                </button>
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="reviews-sort-dropdown"
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="rating">Sort: Highest Rating</option>
                <option value="helpful">Sort: Most Helpful</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          {loading ? (
            <div className="reviews-loading-box">
              <div className="corvun-spinner" />
              <p className="loading-text">INTERROGATING VERIFIED HARDWARE REVIEWS...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="reviews-empty-state">
              <div className="empty-star-icon">★</div>
              <h3 className="empty-title">No Reviews Found</h3>
              <p className="empty-desc">
                {searchQuery || activeTab !== "all"
                  ? "No reviews match your active query filters. Try resetting your search."
                  : "You haven't submitted any hardware reviews yet. Share your experience with custom rigs and components to earn builder rewards."}
              </p>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="empty-action-btn"
              >
                + Review Your First Hardware
              </button>
            </div>
          ) : (
            <div className="reviews-cards-stack">
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="review-item-card">
                  {/* Left: Product Thumbnail & Title */}
                  <div className="review-product-pane">
                    <div className="product-thumb-box">
                      <span className="category-chip">{rev.categoryBadge || "GPU"}</span>
                      <img
                        src={rev.productImage}
                        alt={rev.productName}
                        className="product-thumbnail-img"
                        loading="lazy"
                      />
                    </div>
                    <div className="product-meta-labels">
                      <h3 className="product-name-title">{rev.productName}</h3>
                      {rev.productSubtitle && (
                        <span className="product-subtitle-tag">{rev.productSubtitle}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Review Telemetry, Rating & Content */}
                  <div className="review-content-pane">
                    {/* Header Row: Stars, Verified Badge, Date */}
                    <div className="review-content-header">
                      <div className="rating-and-badges">
                        {renderStars(rev.rating)}
                        <span className="rating-numeric">{(rev.rating || 5).toFixed(1)}</span>
                        {rev.isVerifiedOwner && (
                          <span className="verified-owner-badge">
                            <CheckCircleIcon />
                            <span>Verified Owner</span>
                          </span>
                        )}
                        {rev.status === "pending" && (
                          <span className="pending-review-badge">Pending Moderation</span>
                        )}
                      </div>

                      <span className="review-date-text">
                        Reviewed on {formatDate(rev.createdAt)}
                      </span>
                    </div>

                    {/* Review Title & Paragraph */}
                    <h4 className="review-headline">{rev.title}</h4>
                    <p className="review-comment-body">{rev.comment}</p>

                    {/* Hardware Attribute Tags */}
                    {Array.isArray(rev.attributes) && rev.attributes.length > 0 && (
                      <div className="review-attributes-row">
                        {rev.attributes.map((attr, idx) => (
                          <span key={idx} className="attr-pill">
                            {attr}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Attached Rig Photos */}
                    {Array.isArray(rev.images) && rev.images.length > 0 && (
                      <div className="attached-photos-strip">
                        <span className="attached-label">
                          Attached Rig Photos ({rev.images.length})
                        </span>
                        <div className="attached-thumbnails-row">
                          {rev.images.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt="Rig Benchmark"
                              className="attached-rig-thumb"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="review-card-footer">
                      <span className="helpful-votes-tag">
                        <ThumbsUpIcon />
                        <span>{rev.helpfulVotes || 0} people found this helpful</span>
                      </span>

                      <div className="review-card-actions">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rev)}
                          className="action-btn edit-btn"
                        >
                          <EditIcon />
                          <span>EDIT REVIEW</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingReview(rev)}
                          className="action-btn delete-btn"
                          title="Purge review from ledger"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL: EDIT REVIEW (Screenshot 2)
          ===================================================================== */}
      {editingReview && (
        <div className="reviews-modal-overlay" onClick={() => !isSubmitting && setEditingReview(null)}>
          <div className="reviews-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="reviews-modal-header">
              <div className="modal-title-group">
                <span className="modal-red-dot" />
                <h3 className="modal-title">Edit Review</h3>
                <span className="modal-ref-tag">REV-LOG #{editingReview.id}</span>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setEditingReview(null)}
                className="modal-close-btn"
                disabled={isSubmitting}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Product Summary Header inside Modal */}
            <div className="modal-product-summary">
              <img
                src={editingReview.productImage}
                alt={editingReview.productName}
                className="modal-product-img"
              />
              <div className="modal-product-info">
                <span className="modal-arch-tag">
                  {editingReview.architecture || "HARDWARE ARCHITECTURE"} • VERIFIED PURCHASE
                </span>
                <h4 className="modal-product-title">{editingReview.productName}</h4>
                <span className="modal-product-sub">
                  Purchased via Corvun Monolith Order Ledger
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="reviews-edit-form">
              {/* 1. Overall Hardware Rating */}
              <div className="form-section">
                <div className="rating-header-row">
                  <label className="form-section-label">1. OVERALL HARDWARE RATING *</label>
                  <span className="rating-sub-score">
                    {editForm.rating}.0 / 5.0 -{" "}
                    {editForm.rating === 5
                      ? "Outstanding Performance"
                      : editForm.rating === 4
                      ? "High Performance"
                      : "Standard Performance"}
                  </span>
                </div>

                <div className="rating-stars-interactive">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, rating: star }))}
                      className="star-click-btn"
                    >
                      {star <= editForm.rating ? <StarFilled /> : <StarEmpty />}
                    </button>
                  ))}
                  <span className="telemetry-tier-tag">Telemetry Tier {editForm.rating}</span>
                </div>

                {/* Attribute Pills */}
                <div className="attribute-pills-row">
                  {ATTRIBUTE_PRESETS.map((attr) => {
                    const active = editForm.attributes.includes(attr);
                    return (
                      <button
                        key={attr}
                        type="button"
                        onClick={() => toggleAttribute(attr, true)}
                        className={`attr-select-pill ${active ? "active" : ""}`}
                      >
                        {attr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Review Headline / Title */}
              <div className="form-section">
                <div className="section-label-row">
                  <label className="form-section-label">2. REVIEW HEADLINE / TITLE *</label>
                  <span className="section-hint">Clear &amp; Concise</span>
                </div>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="e.g. Absolute thermal beast for 1440p ultra ray tracing"
                  className="modal-text-input"
                  disabled={isSubmitting}
                />
              </div>

              {/* 3. Detailed Review Experience */}
              <div className="form-section">
                <div className="section-label-row">
                  <label className="form-section-label">3. DETAILED REVIEW EXPERIENCE *</label>
                  <span className="section-hint">
                    {editForm.comment.length} / 2,500 characters
                  </span>
                </div>
                <textarea
                  value={editForm.comment}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, comment: e.target.value }))}
                  required
                  rows="4"
                  maxLength="2500"
                  placeholder="Detail thermal readings, acoustics, frame pacing, and assembly experience..."
                  className="modal-textarea-input"
                  disabled={isSubmitting}
                />
              </div>

              {/* Recommend Toggle */}
              <div className="recommend-toggle-bar">
                <div className="recommend-meta">
                  <span className="recommend-title">Recommend this Hardware?</span>
                  <span className="recommend-sub">
                    Would you recommend this component to other system architects?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, recommend: !prev.recommend }))}
                  className={`recommend-switch ${editForm.recommend ? "on" : "off"}`}
                >
                  <span className="switch-thumb" />
                  <span className="switch-text">{editForm.recommend ? "YES" : "NO"}</span>
                </button>
              </div>

              {/* Footer Notice & Actions */}
              <div className="modal-footer-row">
                <span className="moderation-notice">
                  ⓘ Edited reviews re-verify within 2-4 hours. Reward points unaffected.
                </span>
                <div className="modal-buttons">
                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    disabled={isSubmitting}
                    className="modal-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="modal-btn-save"
                  >
                    {isSubmitting ? "SAVING..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DELETE REVIEW CONFIRMATION (Screenshot 3)
          ===================================================================== */}
      {deletingReview && (
        <div className="reviews-modal-overlay" onClick={() => !isSubmitting && setDeletingReview(null)}>
          <div className="reviews-modal-dialog delete-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <span className="delete-warning-icon">
                <TrashIcon />
              </span>
              <div>
                <span className="delete-prefix">// IRREVERSIBLE ACTION • NODE DELETION</span>
                <h3 className="delete-headline">Delete Review?</h3>
              </div>
            </div>

            <p className="delete-confirm-text">
              Are you sure you want to permanently purge your review and associated telemetry logs for{" "}
              <strong>{deletingReview.productName}</strong>?
            </p>

            <div className="delete-product-card">
              <img
                src={deletingReview.productImage}
                alt={deletingReview.productName}
                className="delete-card-thumb"
              />
              <div className="delete-card-meta">
                <span className="delete-card-title">{deletingReview.productName}</span>
                <span className="delete-card-quote">"{deletingReview.title}"</span>
              </div>
            </div>

            <div className="ledger-impact-box">
              <span className="impact-title">⚠ LEDGER IMPACT TELEMETRY</span>
              <p className="impact-item">
                • This action cannot be undone. Your review prose, thermal benchmarks, and helpful builder votes will be destroyed.
              </p>
              <p className="impact-item">
                • Community bounty reward of 50 pts will be retracted from your active liquid reserve wallet balance.
              </p>
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                disabled={isSubmitting}
                className="delete-btn-keep"
              >
                Keep Review
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="delete-btn-confirm"
              >
                {isSubmitting ? "PURGING..." : "🗑 Yes, Delete Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REVIEW NEW HARDWARE
          ===================================================================== */}
      {isNewModalOpen && (
        <div className="reviews-modal-overlay" onClick={() => !isSubmitting && setIsNewModalOpen(false)}>
          <div className="reviews-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="reviews-modal-header">
              <div className="modal-title-group">
                <span className="modal-red-dot" />
                <h3 className="modal-title">Review New Hardware</h3>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsNewModalOpen(false)}
                className="modal-close-btn"
                disabled={isSubmitting}
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="reviews-edit-form">
              <div className="form-section">
                <label className="form-section-label">PRODUCT / COMPONENT NAME *</label>
                <input
                  type="text"
                  value={newForm.productName}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, productName: e.target.value }))}
                  required
                  placeholder="e.g. ASUS ROG Strix GeForce RTX 4080 Super"
                  className="modal-text-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-section">
                <label className="form-section-label">HARDWARE CATEGORY *</label>
                <select
                  value={newForm.categoryBadge}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, categoryBadge: e.target.value }))}
                  className="modal-text-input"
                  disabled={isSubmitting}
                >
                  <option value="GPU">Graphics Processing Unit (GPU)</option>
                  <option value="CPU">Central Processing Unit (CPU)</option>
                  <option value="RAM">System Memory (RAM)</option>
                  <option value="NVME">NVMe M.2 Solid State Drive</option>
                  <option value="MB">Motherboard</option>
                  <option value="PSU">Power Supply Unit</option>
                  <option value="CASE">Rig Chassis &amp; Cooling</option>
                </select>
              </div>

              <div className="form-section">
                <label className="form-section-label">RATING (1-5 STARS) *</label>
                <div className="rating-stars-interactive">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewForm((prev) => ({ ...prev, rating: star }))}
                      className="star-click-btn"
                    >
                      {star <= newForm.rating ? <StarFilled /> : <StarEmpty />}
                    </button>
                  ))}
                  <span className="telemetry-tier-tag">Rating: {newForm.rating} / 5</span>
                </div>
              </div>

              <div className="form-section">
                <label className="form-section-label">REVIEW TITLE / HEADLINE *</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="e.g. Unbelievable frame times and whisper quiet acoustics"
                  className="modal-text-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-section">
                <label className="form-section-label">DETAILED BENCHMARK / EXPERIENCE *</label>
                <textarea
                  value={newForm.comment}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  required
                  rows="4"
                  placeholder="Describe thermals under load, installation quirks, or compatibility notes..."
                  className="modal-textarea-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="modal-footer-row">
                <span className="moderation-notice">
                  Earn +50 builder points upon verified purchase moderation.
                </span>
                <div className="modal-buttons">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    disabled={isSubmitting}
                    className="modal-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="modal-btn-save"
                  >
                    {isSubmitting ? "DISPATCHING..." : "Publish Review"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
