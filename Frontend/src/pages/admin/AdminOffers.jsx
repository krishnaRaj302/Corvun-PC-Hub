import { useState, useEffect, useCallback } from "react";
import {
  getAdminOffers,
  createAdminOffer,
  updateAdminOffer,
  deleteAdminOffer,
} from "../../services/adminOfferService";
import { getAdminProducts, getAdminCategories } from "../../services/adminProductService";
import "./AdminOffers.css";

/* ─── Helpers ─────────────────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return d;
  }
};

const toInputDate = (isoStr) => {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const formatDiscount = (type, val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "—";
  if (type === "percentage") return `${num}%`;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const PAGE_SIZE = 10;

/* ─── Offer Icon Placeholder ───────────────────────────────── */
function OfferIcon({ applyFor }) {
  if (applyFor === "category") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export default function AdminOffers() {
  /* ── State ─────────────────────────────────────────────────── */
  const [offers, setOffers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ── Product / Category lists for modal ──────────────────── */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  /* ── Modal State ────────────────────────────────────────────── */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentOffer, setCurrentOffer] = useState(null);

  const initialFormData = {
    title: "",
    apply_for: "product",
    product: "",
    category: "",
    discount_type: "percentage",
    discount_value: "",
    starts_at: "",
    ends_at: "",
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);



  /* ── Auto-dismiss toast ──────────────────────────────────── */
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

  /* ── Fetch Offers ────────────────────────────────────────── */
  const fetchOffers = useCallback(async () => {
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

      const data = await getAdminOffers(params);
      const results = data.offers || data.results || (Array.isArray(data) ? data : []);
      setOffers(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);
    } catch (err) {
      console.error("AdminOffers fetch error:", err);
      setError("Unable to load offers. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  /* ── Fetch Products & Categories for modal ───────────────── */
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await getAdminProducts({ page_size: 200 });
      const results = data.products || data.results || (Array.isArray(data) ? data : []);
      setProducts(results);
    } catch (err) {
      console.error("AdminOffers: failed to fetch products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await getAdminCategories();
      const results = data.categories || data.results || (Array.isArray(data) ? data : []);
      setCategories(results);
    } catch (err) {
      console.error("AdminOffers: failed to fetch categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  /* ── Search & Filter Handlers ────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  /* ── Add Modal Handlers ──────────────────────────────────── */
  const handleOpenAddModal = async () => {
    setFormData(initialFormData);
    setFormErrors({});
    setIsAddModalOpen(true);
    await Promise.all([fetchProducts(), fetchCategories()]);
  };

  /* ── Edit Modal Handlers ─────────────────────────────────── */
  const handleOpenEditModal = async (offer) => {
    setCurrentOffer(offer);
    setFormData({
      title: offer.title || "",
      apply_for: offer.apply_for || "product",
      product: offer.product ? String(offer.product) : "",
      category: offer.category ? String(offer.category) : "",
      discount_type: offer.discount_type || "percentage",
      discount_value: offer.discount_value !== undefined ? String(parseFloat(offer.discount_value)) : "",
      starts_at: toInputDate(offer.starts_at),
      ends_at: toInputDate(offer.ends_at),
      is_active: offer.is_active !== undefined ? offer.is_active : true,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
    await Promise.all([fetchProducts(), fetchCategories()]);
  };

  /* ── Delete Modal Handlers ───────────────────────────────── */
  const handleOpenDeleteModal = (offer) => {
    setCurrentOffer(offer);
    setIsDeleteModalOpen(true);
  };

  /* ── Form Change Handlers ────────────────────────────────── */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      // Clear target when apply_for changes
      ...(name === "apply_for" ? { product: "", category: "" } : {}),
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleToggle = () => {
    setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
  };

  /* ── Client Validation ───────────────────────────────────── */
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Offer title is required.";
    }
    if (formData.apply_for === "product" && !formData.product) {
      errors.product = "Please select a product.";
    }
    if (formData.apply_for === "category" && !formData.category) {
      errors.category = "Please select a category.";
    }
    const val = parseFloat(formData.discount_value);
    if (!formData.discount_value || isNaN(val) || val <= 0) {
      errors.discount_value = "Discount value must be greater than 0.";
    } else if (formData.discount_type === "percentage" && val > 100) {
      errors.discount_value = "Percentage discount cannot exceed 100%.";
    }
    if (!formData.starts_at) {
      errors.starts_at = "Start date is required.";
    }
    if (!formData.ends_at) {
      errors.ends_at = "End date is required.";
    }
    if (formData.starts_at && formData.ends_at && formData.ends_at < formData.starts_at) {
      errors.ends_at = "End date cannot be before start date.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Build Payload ───────────────────────────────────────── */
  const buildPayload = () => {
    const payload = {
      title: formData.title.trim(),
      apply_for: formData.apply_for,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      starts_at: new Date(formData.starts_at).toISOString(),
      ends_at: new Date(formData.ends_at).toISOString(),
      is_active: formData.is_active,
    };
    if (formData.apply_for === "product") {
      payload.product = parseInt(formData.product, 10);
      payload.category = null;
    } else {
      payload.category = parseInt(formData.category, 10);
      payload.product = null;
    }
    return payload;
  };

  /* ── Create Offer ────────────────────────────────────────── */
  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setFormErrors({});
    try {
      await createAdminOffer(buildPayload());
      showToast("Offer created successfully!", "success");
      setIsAddModalOpen(false);
      fetchOffers();
    } catch (err) {
      console.error("Create offer error:", err);
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const errMsg =
          typeof err.response.data === "string"
            ? err.response.data
            : err.response.data.error || err.response.data.detail || "Failed to create offer.";
        showToast(errMsg, "error");
      } else {
        showToast("Network error creating offer.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Update Offer ────────────────────────────────────────── */
  const handleUpdateOffer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setFormErrors({});
    try {
      await updateAdminOffer(currentOffer.id, buildPayload());
      showToast("Offer updated successfully!", "success");
      setIsEditModalOpen(false);
      fetchOffers();
    } catch (err) {
      console.error("Update offer error:", err);
      if (err.response?.data) {
        setFormErrors(err.response.data);
        const errMsg =
          typeof err.response.data === "string"
            ? err.response.data
            : err.response.data.error || err.response.data.detail || "Failed to update offer.";
        showToast(errMsg, "error");
      } else {
        showToast("Network error updating offer.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete Offer ────────────────────────────────────────── */
  const handleDeleteOffer = async () => {
    if (!currentOffer) return;
    setDeleting(true);
    try {
      await deleteAdminOffer(currentOffer.id);
      showToast(`Offer "${currentOffer.title}" deleted successfully.`, "success");
      setIsDeleteModalOpen(false);
      if (offers.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchOffers();
      }
    } catch (err) {
      console.error("Delete offer error:", err);
      showToast(err.response?.data?.error || "Failed to delete offer.", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Pagination ──────────────────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalCount);



  /* ── Modal Form (shared for Add and Edit) ─────────────────── */
  const renderModalForm = (onSubmit, modalTitle, isOpen, onClose) => {
    if (!isOpen) return null;
    return (
      <div className="of-modal-backdrop" onClick={() => !submitting && onClose()}>
        <div className="of-modal" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="of-modal-header">
            <h2 className="of-modal-title">{modalTitle}</h2>
            <button
              type="button"
              className="of-modal-close"
              onClick={() => !submitting && onClose()}
              aria-label="Close modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit} className="of-modal-form" noValidate>
            {/* OFFER TITLE */}
            <div className="of-form-group of-form-group--full">
              <label className="of-form-label">OFFER TITLE</label>
              <input
                type="text"
                name="title"
                className={`of-input ${formErrors.title ? "of-input--error" : ""}`}
                placeholder="e.g., Diwali Discount"
                value={formData.title}
                onChange={handleInputChange}
                autoComplete="off"
              />
              {formErrors.title && (
                <span className="of-form-error">{formErrors.title}</span>
              )}
            </div>

            {/* OFFER TYPE + PRODUCT/CATEGORY */}
            <div className="of-form-row">
              <div className="of-form-group">
                <label className="of-form-label">OFFER TYPE</label>
                <div className="of-select-wrapper">
                  <select
                    name="apply_for"
                    className="of-select"
                    value={formData.apply_for}
                    onChange={handleInputChange}
                  >
                    <option value="product">Product</option>
                    <option value="category">Category</option>
                  </select>
                  <svg className="of-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <div className="of-form-group">
                {formData.apply_for === "product" ? (
                  <>
                    <label className="of-form-label">SELECT PRODUCT</label>
                    {loadingProducts ? (
                      <div className="of-input of-input--loading">Loading products...</div>
                    ) : (
                      <div className="of-select-wrapper">
                        <select
                          name="product"
                          className={`of-select ${formErrors.product ? "of-select--error" : ""}`}
                          value={formData.product}
                          onChange={handleInputChange}
                        >
                          <option value="">Search for a product...</option>
                          {products.length === 0 ? (
                            <option disabled>No products available</option>
                          ) : (
                            products.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                        <svg className="of-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    )}
                    {formErrors.product && (
                      <span className="of-form-error">{formErrors.product}</span>
                    )}
                  </>
                ) : (
                  <>
                    <label className="of-form-label">SELECT CATEGORY</label>
                    {loadingCategories ? (
                      <div className="of-input of-input--loading">Loading categories...</div>
                    ) : (
                      <div className="of-select-wrapper">
                        <select
                          name="category"
                          className={`of-select ${formErrors.category ? "of-select--error" : ""}`}
                          value={formData.category}
                          onChange={handleInputChange}
                        >
                          <option value="">Select a category...</option>
                          {categories.length === 0 ? (
                            <option disabled>No categories available</option>
                          ) : (
                            categories.map((c) => (
                              <option key={c.id} value={String(c.id)}>
                                {c.name}
                              </option>
                            ))
                          )}
                        </select>
                        <svg className="of-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    )}
                    {formErrors.category && (
                      <span className="of-form-error">{formErrors.category}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* DISCOUNT TYPE + DISCOUNT VALUE */}
            <div className="of-form-row">
              <div className="of-form-group">
                <label className="of-form-label">DISCOUNT TYPE</label>
                <div className="of-select-wrapper">
                  <select
                    name="discount_type"
                    className="of-select"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                  <svg className="of-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <div className="of-form-group">
                <label className="of-form-label">DISCOUNT VALUE</label>
                <div className="of-input-suffix-wrapper">
                  <input
                    type="number"
                    name="discount_value"
                    className={`of-input of-input--with-suffix ${formErrors.discount_value ? "of-input--error" : ""}`}
                    placeholder="Enter value"
                    step="0.01"
                    min="0.01"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value}
                    onChange={handleInputChange}
                  />
                  <span className="of-input-suffix">
                    {formData.discount_type === "percentage" ? "%" : "₹"}
                  </span>
                </div>
                {formErrors.discount_value && (
                  <span className="of-form-error">{formErrors.discount_value}</span>
                )}
              </div>
            </div>

            {/* START DATE + END DATE */}
            <div className="of-form-row">
              <div className="of-form-group">
                <label className="of-form-label">START DATE</label>
                <input
                  type="date"
                  name="starts_at"
                  className={`of-input ${formErrors.starts_at ? "of-input--error" : ""}`}
                  value={formData.starts_at}
                  onChange={handleInputChange}
                />
                {formErrors.starts_at && (
                  <span className="of-form-error">{formErrors.starts_at}</span>
                )}
              </div>

              <div className="of-form-group">
                <label className="of-form-label">END DATE</label>
                <input
                  type="date"
                  name="ends_at"
                  className={`of-input ${formErrors.ends_at ? "of-input--error" : ""}`}
                  value={formData.ends_at}
                  onChange={handleInputChange}
                  min={formData.starts_at || undefined}
                />
                {formErrors.ends_at && (
                  <span className="of-form-error">{formErrors.ends_at}</span>
                )}
              </div>
            </div>

            {/* STATUS TOGGLE */}
            <div className="of-form-group of-form-group--full">
              <label className="of-form-label">STATUS</label>
              <div className="of-toggle-row">
                <span className={`of-toggle-label ${!formData.is_active ? "of-toggle-label--active" : ""}`}>
                  Inactive
                </span>
                <button
                  type="button"
                  className={`of-toggle ${formData.is_active ? "of-toggle--on" : ""}`}
                  onClick={handleToggle}
                  aria-pressed={formData.is_active}
                  aria-label="Toggle active status"
                >
                  <span className="of-toggle-thumb" />
                </button>
                <span className={`of-toggle-label ${formData.is_active ? "of-toggle-label--active" : ""}`}>
                  Active
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="of-modal-actions">
              <button
                type="button"
                className="of-btn-cancel"
                onClick={() => !submitting && onClose()}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="of-btn-save"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Offer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="of-page">
      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast.show && (
        <div className={`of-toast of-toast--${toast.type}`}>
          <div className="of-toast-content">
            <span className="of-toast-indicator" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="of-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="of-header">
        <div className="of-header-left">
          <h1 className="of-title">Offers Management</h1>
          <p className="of-subtitle">
            Create and manage promotional offers for products.
          </p>
        </div>
        <div className="of-header-right">
          <button
            type="button"
            className="of-btn-primary"
            onClick={handleOpenAddModal}
            id="of-add-offer-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Offer
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="of-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="of-btn-secondary" onClick={fetchOffers}>
            Retry
          </button>
        </div>
      )}

      {/* ── Search & Filter ─────────────────────────────────────── */}
      <div className="of-controls">
        <div className="of-search-box">
          <svg className="of-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="of-search-input"
            placeholder="Search offers..."
            value={search}
            onChange={handleSearchChange}
            id="of-search-input"
          />
          {search && (
            <button
              type="button"
              className="of-search-clear"
              onClick={() => { setSearch(""); setCurrentPage(1); }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="of-select-wrapper of-filter-select">
          <select
            className="of-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            id="of-status-filter"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <svg className="of-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────── */}
      <div className="of-table-card">
        {loading ? (
          <div className="of-loading-container">
            <div className="of-spinner" />
            <span>Loading offers...</span>
          </div>
        ) : offers.length === 0 ? (
          <div className="of-empty-state">
            <div className="of-empty-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <h3 className="of-empty-title">
              {search || statusFilter !== "all" ? "No matching offers found" : "No offers found"}
            </h3>
            <p className="of-empty-desc">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first promotional offer to get started."}
            </p>
            {!(search || statusFilter !== "all") && (
              <button type="button" className="of-btn-primary" onClick={handleOpenAddModal}>
                + Add New Offer
              </button>
            )}
          </div>
        ) : (
          <div className="of-table-responsive">
            <table className="of-table">
              <thead>
                <tr>
                  <th>IMAGE</th>
                  <th>OFFER TITLE</th>
                  <th>TYPE</th>
                  <th>PRODUCT</th>
                  <th>DISCOUNT</th>
                  <th>VALID PERIOD</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="of-table-row">
                    {/* IMAGE */}
                    <td>
                      <div className="of-img-placeholder">
                        <OfferIcon applyFor={offer.apply_for} />
                      </div>
                    </td>

                    {/* OFFER TITLE */}
                    <td>
                      <span className="of-offer-title">{offer.title}</span>
                    </td>

                    {/* TYPE */}
                    <td>
                      <span className="of-type-text">
                        {offer.apply_for === "product" ? "Product" : "Category"}
                      </span>
                    </td>

                    {/* PRODUCT / CATEGORY NAME */}
                    <td>
                      <span className="of-target-text">
                        {offer.apply_for === "product"
                          ? offer.product_name || "—"
                          : offer.category_name || "—"}
                      </span>
                    </td>

                    {/* DISCOUNT */}
                    <td>
                      <span className="of-discount-value">
                        {formatDiscount(offer.discount_type, offer.discount_value)}
                      </span>
                    </td>

                    {/* VALID PERIOD */}
                    <td>
                      <span className="of-period-text">
                        {formatDate(offer.starts_at)} – {formatDate(offer.ends_at)}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td>
                      {offer.is_active ? (
                        <span className="of-badge of-badge--active">Active</span>
                      ) : (
                        <span className="of-badge of-badge--inactive">Inactive</span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="of-actions-group">
                        <button
                          type="button"
                          className="of-action-btn of-action-btn--edit"
                          title="Edit Offer"
                          onClick={() => handleOpenEditModal(offer)}
                          id={`of-edit-btn-${offer.id}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="of-action-btn of-action-btn--delete"
                          title="Delete Offer"
                          onClick={() => handleOpenDeleteModal(offer)}
                          id={`of-delete-btn-${offer.id}`}
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

        {/* ── Pagination ───────────────────────────────────────── */}
        {!loading && (
          <div className="of-pagination">
            <span className="of-pagination-info">
              {totalCount === 0
                ? "Showing 0 of 0 registered offers"
                : `Showing ${startIdx}–${endIdx} of ${totalCount} registered offer${totalCount !== 1 ? "s" : ""}`}
            </span>

            {totalCount > 0 && (
              <div className="of-pagination-controls">
                <button
                  type="button"
                  className="of-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
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
                        className={`of-page-number ${currentPage === pg ? "of-page-number--active" : ""}`}
                        onClick={() => setCurrentPage(pg)}
                      >
                        {pg}
                      </button>
                    );
                  }
                  if (pg === 2 || pg === totalPages - 1) {
                    return (
                      <span key={pg} className="of-page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  type="button"
                  className="of-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Offer Modal ─────────────────────────────────────── */}
      {renderModalForm(
        handleCreateOffer,
        "Add New Offer",
        isAddModalOpen,
        () => setIsAddModalOpen(false)
      )}

      {/* ── Edit Offer Modal ────────────────────────────────────── */}
      {renderModalForm(
        handleUpdateOffer,
        "Edit Offer",
        isEditModalOpen,
        () => setIsEditModalOpen(false)
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="of-modal-backdrop" onClick={() => !deleting && setIsDeleteModalOpen(false)}>
          <div className="of-modal of-modal--delete" onClick={(e) => e.stopPropagation()}>
            <div className="of-delete-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="of-delete-title">Confirm Offer Deletion</h2>
            <p className="of-delete-desc">
              Are you sure you want to permanently delete the offer{" "}
              <strong>"{currentOffer?.title}"</strong>? This action is irreversible and cannot be undone.
            </p>
            <div className="of-modal-actions of-modal-actions--delete">
              <button
                type="button"
                className="of-btn-cancel"
                onClick={() => !deleting && setIsDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="of-btn-delete"
                onClick={handleDeleteOffer}
                disabled={deleting}
                id="of-confirm-delete-btn"
              >
                {deleting ? "Deleting..." : "Delete Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
