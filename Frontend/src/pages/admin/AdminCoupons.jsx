import { useState, useEffect, useCallback } from "react";
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
} from "../../services/adminCouponService";
import "./AdminCoupons.css";

/* ─── Helpers ──────────────────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
};

const toInputDateTime = (isoStr) => {
  if (!isoStr) return "";
  try {
    const dt = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  } catch {
    return "";
  }
};

const formatDiscount = (type, val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "—";
  if (type === "percentage") {
    return `${num}% OFF`;
  }
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} OFF`;
};

const PAGE_SIZE = 8;

export default function AdminCoupons() {
  /* ── State ─────────────────────────────────────────────────── */
  const [coupons, setCoupons] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [copiedCode, setCopiedCode] = useState(null);

  /* ── Modals State ──────────────────────────────────────────── */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);

  const initialFormData = {
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    expiry_date: "",
    status: "active",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  /* ── Copy Code to Clipboard ────────────────────────────────── */
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Copied ${code} to clipboard!`, "success");
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  /* ── Fetch Coupons ─────────────────────────────────────────── */
  const fetchCoupons = useCallback(async () => {
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
      if (discountTypeFilter && discountTypeFilter !== "all") {
        params.discount_type = discountTypeFilter;
      }

      const data = await getAdminCoupons(params);
      const results = data.coupons || data.results || (Array.isArray(data) ? data : []);
      setCoupons(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);
    } catch (err) {
      console.error("AdminCoupons fetch error:", err);
      setError("Unable to load coupons. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, discountTypeFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  /* ── Search and Filter Handlers ────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDiscountTypeFilterChange = (e) => {
    setDiscountTypeFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDiscountTypeFilter("all");
    setCurrentPage(1);
  };

  /* ── Add Modal Handlers ────────────────────────────────────── */
  const handleOpenAddModal = () => {
    // Set default expiry date to 30 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    defaultExpiry.setHours(23, 59, 0, 0);

    setFormData({
      ...initialFormData,
      expiry_date: toInputDateTime(defaultExpiry.toISOString()),
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  /* ── Edit Modal Handlers ───────────────────────────────────── */
  const handleOpenEditModal = (coupon) => {
    setCurrentCoupon(coupon);
    setFormData({
      code: coupon.code || "",
      description: coupon.description || "",
      discount_type: coupon.discount_type || "percentage",
      discount_value: coupon.discount_value !== undefined ? String(coupon.discount_value) : "",
      expiry_date: toInputDateTime(coupon.expiry_date),
      status: coupon.status || "active",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  /* ── Delete Modal Handlers ─────────────────────────────────── */
  const handleOpenDeleteModal = (coupon) => {
    setCurrentCoupon(coupon);
    setIsDeleteModalOpen(true);
  };

  /* ── Form Change Handler ───────────────────────────────────── */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase().replace(/\s+/g, "") : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  /* ── Client Validation ─────────────────────────────────────── */
  const validateForm = () => {
    const errors = {};
    if (!formData.code || formData.code.trim().length < 3) {
      errors.code = "Coupon code must be at least 3 characters.";
    }
    const val = parseFloat(formData.discount_value);
    if (!formData.discount_value || isNaN(val) || val <= 0) {
      errors.discount_value = "Discount value must be greater than 0.";
    } else if (formData.discount_type === "percentage" && val > 100) {
      errors.discount_value = "Percentage discount cannot exceed 100%.";
    }
    if (!formData.expiry_date) {
      errors.expiry_date = "Expiry date is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Add Coupon Submit ─────────────────────────────────────── */
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        expiry_date: new Date(formData.expiry_date).toISOString(),
        status: formData.status,
      };

      await createAdminCoupon(payload);
      showToast(`Coupon ${payload.code} created successfully!`, "success");
      setIsAddModalOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error("Create coupon error:", err);
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const errMsg = typeof err.response.data === "string"
          ? err.response.data
          : err.response.data.error || err.response.data.detail || "Failed to create coupon.";
        showToast(errMsg, "error");
      } else {
        showToast("Network error creating coupon.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Edit Coupon Submit ────────────────────────────────────── */
  const handleUpdateCoupon = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        expiry_date: new Date(formData.expiry_date).toISOString(),
        status: formData.status,
      };

      await updateAdminCoupon(currentCoupon.id, payload);
      showToast(`Coupon ${payload.code} updated successfully!`, "success");
      setIsEditModalOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error("Update coupon error:", err);
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const errMsg = typeof err.response.data === "string"
          ? err.response.data
          : err.response.data.error || err.response.data.detail || "Failed to update coupon.";
        showToast(errMsg, "error");
      } else {
        showToast("Network error updating coupon.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete Coupon Submit ──────────────────────────────────── */
  const handleDeleteCoupon = async () => {
    if (!currentCoupon) return;
    setDeleting(true);
    try {
      await deleteAdminCoupon(currentCoupon.id);
      showToast(`Coupon ${currentCoupon.code} deleted successfully.`, "success");
      setIsDeleteModalOpen(false);
      // If last item on current page and not first page, go back 1 page
      if (coupons.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchCoupons();
      }
    } catch (err) {
      console.error("Delete coupon error:", err);
      showToast(err.response?.data?.error || "Failed to delete coupon.", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Pagination Calculations ───────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalCount);

  /* ── Status pill generator ─────────────────────────────────── */
  const renderStatusBadge = (coupon) => {
    const isExpired = coupon.is_expired || (coupon.expiry_date && new Date(coupon.expiry_date) < new Date());

    if (isExpired) {
      return (
        <span className="cp-badge cp-badge--expired" title="This coupon has expired">
          <span className="cp-badge-dot" /> Expired
        </span>
      );
    }
    if (coupon.status === "active") {
      return (
        <span className="cp-badge cp-badge--active" title="Active and ready to use">
          <span className="cp-badge-dot" /> Active
        </span>
      );
    }
    return (
      <span className="cp-badge cp-badge--inactive" title="Inactive">
        <span className="cp-badge-dot" /> Inactive
      </span>
    );
  };

  return (
    <div className="cp-page">
      {/* ── Toast Notification ────────────────────────────────── */}
      {toast.show && (
        <div className={`cp-toast cp-toast--${toast.type}`}>
          <div className="cp-toast-content">
            <span className="cp-toast-indicator" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="cp-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="cp-header">
        <div className="cp-header-left">
          <h1 className="cp-title">Coupons & Discounts</h1>
          <p className="cp-subtitle">
            Create, monitor, and manage promotional discount codes and coupons.
          </p>
        </div>
        <div className="cp-header-right">
          <button
            type="button"
            className="cp-btn-primary"
            onClick={handleOpenAddModal}
            id="cp-add-coupon-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Coupon
          </button>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────── */}
      {error && (
        <div className="cp-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="cp-btn-secondary" onClick={fetchCoupons}>
            Retry
          </button>
        </div>
      )}

      {/* ── Search & Filter Controls ──────────────────────────── */}
      <div className="cp-controls">
        <div className="cp-search-box">
          <svg className="cp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="cp-search-input"
            placeholder="Search by code or description..."
            value={search}
            onChange={handleSearchChange}
            id="cp-search-input"
          />
          {search && (
            <button
              type="button"
              className="cp-search-clear"
              onClick={() => { setSearch(""); setCurrentPage(1); }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="cp-filter-group">
          <select
            className="cp-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            id="cp-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>

          <select
            className="cp-select"
            value={discountTypeFilter}
            onChange={handleDiscountTypeFilterChange}
            id="cp-type-filter"
          >
            <option value="all">All Discount Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>

          {(search || statusFilter !== "all" || discountTypeFilter !== "all") && (
            <button
              type="button"
              className="cp-btn-secondary"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Coupons Table Container ───────────────────────────── */}
      <div className="cp-table-card">
        {loading ? (
          <div className="cp-loading-container">
            <div className="cp-spinner" />
            <span>Loading coupons...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <h3 className="cp-empty-title">
              {search || statusFilter !== "all" || discountTypeFilter !== "all"
                ? "No matching coupons found"
                : "No coupons found"}
            </h3>
            <p className="cp-empty-desc">
              {search || statusFilter !== "all" || discountTypeFilter !== "all"
                ? "Try adjusting your search query or filters to find what you're looking for."
                : "Create your first discount coupon to start rewarding your customers."}
            </p>
            {search || statusFilter !== "all" || discountTypeFilter !== "all" ? (
              <button
                type="button"
                className="cp-btn-secondary"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                className="cp-btn-primary"
                onClick={handleOpenAddModal}
              >
                + Create Coupon
              </button>
            )}
          </div>
        ) : (
          <div className="cp-table-responsive">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>COUPON CODE</th>
                  <th>DESCRIPTION</th>
                  <th>DISCOUNT</th>
                  <th>TYPE</th>
                  <th>EXPIRY DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="cp-table-row">
                    <td>
                      <div className="cp-code-wrapper">
                        <span className="cp-code-badge">{coupon.code}</span>
                        <button
                          type="button"
                          className="cp-copy-btn"
                          title="Copy coupon code"
                          onClick={() => handleCopyCode(coupon.code)}
                        >
                          {copiedCode === coupon.code ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="cp-desc-text" title={coupon.description || ""}>
                        {coupon.description || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="cp-discount-value">
                        {formatDiscount(coupon.discount_type, coupon.discount_value)}
                      </span>
                    </td>
                    <td>
                      <span className="cp-type-badge">
                        {coupon.discount_type === "percentage" ? "Percentage" : "Fixed Amount"}
                      </span>
                    </td>
                    <td>
                      <span className="cp-date-text">
                        {formatDate(coupon.expiry_date)}
                      </span>
                    </td>
                    <td>{renderStatusBadge(coupon)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="cp-actions-group">
                        <button
                          type="button"
                          className="cp-action-btn cp-action-btn--edit"
                          title="Edit Coupon"
                          onClick={() => handleOpenEditModal(coupon)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="cp-action-btn cp-action-btn--delete"
                          title="Delete Coupon"
                          onClick={() => handleOpenDeleteModal(coupon)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ───────────────────────────────── */}
        {!loading && coupons.length > 0 && (
          <div className="cp-pagination">
            <span className="cp-pagination-info">
              Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> of{" "}
              <strong>{totalCount}</strong> results
            </span>

            <div className="cp-pagination-controls">
              <button
                type="button"
                className="cp-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹ Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                // Show first, last, and pages close to currentPage
                if (
                  totalPages <= 7 ||
                  pg === 1 ||
                  pg === totalPages ||
                  (pg >= currentPage - 1 && pg <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      className={`cp-page-number ${currentPage === pg ? "cp-page-number--active" : ""}`}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  );
                }
                if (pg === 2 || pg === totalPages - 1) {
                  return (
                    <span key={pg} className="cp-page-ellipsis">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                type="button"
                className="cp-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Coupon Modal ──────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="cp-modal-backdrop" onClick={() => !submitting && setIsAddModalOpen(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h2 className="cp-modal-title">Create New Coupon</h2>
              <button
                type="button"
                className="cp-modal-close"
                onClick={() => !submitting && setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="cp-modal-form">
              <div className="cp-form-group">
                <label className="cp-form-label">
                  Coupon Code <span className="cp-required">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  className={`cp-input ${formErrors.code ? "cp-input--error" : ""}`}
                  placeholder="e.g. SUMMER2026"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.code && (
                  <span className="cp-form-error">{formErrors.code}</span>
                )}
                <span className="cp-form-hint">
                  Uppercase letters and numbers only. Minimum 3 characters.
                </span>
              </div>

              <div className="cp-form-group">
                <label className="cp-form-label">Description</label>
                <textarea
                  name="description"
                  className="cp-textarea"
                  placeholder="e.g. 20% discount on all custom PC gaming rigs."
                  rows="2"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label className="cp-form-label">
                    Discount Type <span className="cp-required">*</span>
                  </label>
                  <select
                    name="discount_type"
                    className="cp-select"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="cp-form-group">
                  <label className="cp-form-label">
                    Discount Value <span className="cp-required">*</span>
                  </label>
                  <div className="cp-input-prefix-wrapper">
                    <span className="cp-input-prefix">
                      {formData.discount_type === "percentage" ? "%" : "₹"}
                    </span>
                    <input
                      type="number"
                      name="discount_value"
                      className={`cp-input cp-input--with-prefix ${formErrors.discount_value ? "cp-input--error" : ""}`}
                      placeholder={formData.discount_type === "percentage" ? "e.g. 15" : "e.g. 500"}
                      step="0.01"
                      min="0.01"
                      max={formData.discount_type === "percentage" ? "100" : undefined}
                      value={formData.discount_value}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {formErrors.discount_value && (
                    <span className="cp-form-error">{formErrors.discount_value}</span>
                  )}
                </div>
              </div>

              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label className="cp-form-label">
                    Expiry Date & Time <span className="cp-required">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="expiry_date"
                    className={`cp-input ${formErrors.expiry_date ? "cp-input--error" : ""}`}
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    required
                  />
                  {formErrors.expiry_date && (
                    <span className="cp-form-error">{formErrors.expiry_date}</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-form-label">Status</label>
                  <select
                    name="status"
                    className="cp-select"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="cp-modal-actions">
                <button
                  type="button"
                  className="cp-btn-secondary"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cp-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Coupon Modal ─────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="cp-modal-backdrop" onClick={() => !submitting && setIsEditModalOpen(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h2 className="cp-modal-title">Edit Coupon</h2>
              <button
                type="button"
                className="cp-modal-close"
                onClick={() => !submitting && setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="cp-modal-form">
              <div className="cp-form-group">
                <label className="cp-form-label">
                  Coupon Code <span className="cp-required">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  className={`cp-input ${formErrors.code ? "cp-input--error" : ""}`}
                  placeholder="e.g. SUMMER2026"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.code && (
                  <span className="cp-form-error">{formErrors.code}</span>
                )}
              </div>

              <div className="cp-form-group">
                <label className="cp-form-label">Description</label>
                <textarea
                  name="description"
                  className="cp-textarea"
                  placeholder="e.g. 20% discount on all custom PC gaming rigs."
                  rows="2"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label className="cp-form-label">
                    Discount Type <span className="cp-required">*</span>
                  </label>
                  <select
                    name="discount_type"
                    className="cp-select"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="cp-form-group">
                  <label className="cp-form-label">
                    Discount Value <span className="cp-required">*</span>
                  </label>
                  <div className="cp-input-prefix-wrapper">
                    <span className="cp-input-prefix">
                      {formData.discount_type === "percentage" ? "%" : "₹"}
                    </span>
                    <input
                      type="number"
                      name="discount_value"
                      className={`cp-input cp-input--with-prefix ${formErrors.discount_value ? "cp-input--error" : ""}`}
                      step="0.01"
                      min="0.01"
                      max={formData.discount_type === "percentage" ? "100" : undefined}
                      value={formData.discount_value}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {formErrors.discount_value && (
                    <span className="cp-form-error">{formErrors.discount_value}</span>
                  )}
                </div>
              </div>

              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label className="cp-form-label">
                    Expiry Date & Time <span className="cp-required">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="expiry_date"
                    className={`cp-input ${formErrors.expiry_date ? "cp-input--error" : ""}`}
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    required
                  />
                  {formErrors.expiry_date && (
                    <span className="cp-form-error">{formErrors.expiry_date}</span>
                  )}
                </div>

                <div className="cp-form-group">
                  <label className="cp-form-label">Status</label>
                  <select
                    name="status"
                    className="cp-select"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="cp-modal-actions">
                <button
                  type="button"
                  className="cp-btn-secondary"
                  disabled={submitting}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cp-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {isDeleteModalOpen && currentCoupon && (
        <div className="cp-modal-backdrop" onClick={() => !deleting && setIsDeleteModalOpen(false)}>
          <div className="cp-modal cp-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h2 className="cp-modal-title">Delete Coupon</h2>
              <button
                type="button"
                className="cp-modal-close"
                onClick={() => !deleting && setIsDeleteModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="cp-delete-content">
              <div className="cp-delete-warning-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <p className="cp-delete-text">
                Are you sure you want to delete coupon{" "}
                <strong className="cp-delete-highlight">{currentCoupon.code}</strong>?
              </p>
              <p className="cp-delete-subtext">
                This action cannot be undone. Customers will no longer be able to apply this discount.
              </p>
            </div>

            <div className="cp-modal-actions">
              <button
                type="button"
                className="cp-btn-secondary"
                disabled={deleting}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cp-btn-danger"
                disabled={deleting}
                onClick={handleDeleteCoupon}
              >
                {deleting ? "Deleting..." : "Delete Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
