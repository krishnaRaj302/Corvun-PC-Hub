import { useState, useEffect, useCallback } from "react";
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from "../../services/adminCategoryService";
import "./AdminCategories.css";

export default function AdminCategories() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [categories, setCategories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8; // Per Figma "Showing 1 to 8 of 8 results"

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ── Modals State ──────────────────────────────────────────────────── */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── Auto-dismiss toast ───────────────────────────────────────────── */
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

  /* ── Fetch Categories ─────────────────────────────────────────────── */
  const fetchCategories = useCallback(async () => {
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

      const data = await getAdminCategories(params);
      const results = data.results || (Array.isArray(data) ? data : []);
      setCategories(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);
    } catch (err) {
      console.error("AdminCategories fetch error:", err);
      setError("Unable to load categories. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ── Filter Handlers ──────────────────────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  /* ── Add Category Modal Handlers ──────────────────────────────────── */
  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      description: "",
      status: true,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  /* ── Edit Category Modal Handlers ─────────────────────────────────── */
  const handleOpenEditModal = (cat) => {
    setCurrentCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      status: Boolean(cat.status),
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  /* ── Delete Modal Handlers ────────────────────────────────────────── */
  const handleOpenDeleteModal = (cat) => {
    setCurrentCategory(cat);
    setIsDeleteModalOpen(true);
  };

  /* ── Validate Form ────────────────────────────────────────────────── */
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Category name is required.";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Category name must be at least 2 characters.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Save (Create / Update) ───────────────────────────────────────── */
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      };

      if (isEditModalOpen && currentCategory) {
        await updateAdminCategory(currentCategory.id, payload);
        showToast(`Category "${payload.name}" updated successfully.`);
        setIsEditModalOpen(false);
      } else {
        await createAdminCategory(payload);
        showToast(`Category "${payload.name}" created successfully.`);
        setIsAddModalOpen(false);
      }

      fetchCategories();
    } catch (err) {
      console.error("Save category error:", err);
      const resErrors = err.response?.data;
      if (resErrors && typeof resErrors === "object") {
        if (resErrors.name) {
          setFormErrors({ name: Array.isArray(resErrors.name) ? resErrors.name[0] : resErrors.name });
        } else if (resErrors.error) {
          showToast(resErrors.error, "error");
        } else if (resErrors.detail) {
          showToast(resErrors.detail, "error");
        } else {
          showToast("Failed to save category. Please check your inputs.", "error");
        }
      } else {
        showToast("Server error. Please try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Confirm Delete ───────────────────────────────────────────────── */
  const handleConfirmDelete = async () => {
    if (!currentCategory) return;
    if (currentCategory.product_count > 0) {
      showToast("Cannot delete category containing products. Reassign or remove products first.", "error");
      return;
    }

    setDeleting(true);
    try {
      await deleteAdminCategory(currentCategory.id);
      showToast(`Category "${currentCategory.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setCurrentCategory(null);
      fetchCategories();
    } catch (err) {
      console.error("Delete category error:", err);
      const errMsg = err.response?.data?.error || "Error deleting category.";
      showToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Pagination Calculations ──────────────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="ac-page">
      {/* ── Toast Notification ─────────────────────────────────────── */}
      {toast.show && (
        <div className={`ac-toast ${toast.type === "error" ? "ac-toast--error" : ""}`}>
          <div className="ac-toast-content">
            <span className="ac-toast-indicator"></span>
            <span>{toast.message}</span>
          </div>
          <button
            className="ac-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="ac-header">
        <div className="ac-header-left">
          <h1 className="ac-title">Categories Management</h1>
          <p className="ac-subtitle">
            Manage product categories for the high-performance PC hardware catalog.
          </p>
        </div>

        <button className="ac-add-btn" onClick={handleOpenAddModal} id="add-category-btn">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Category
        </button>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div className="ac-filter-bar">
        <div className="ac-search-wrap">
          <svg
            className="ac-search-icon"
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
            className="ac-search-input"
            placeholder="Search by category name..."
            value={search}
            onChange={handleSearchChange}
            id="category-search-input"
          />
        </div>

        <div className="ac-select-wrap">
          <select
            className="ac-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            id="category-status-filter"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Table Container ────────────────────────────────────────── */}
      <div className="ac-card">
        {loading ? (
          <div className="ac-loading-container">
            <div className="ac-spinner"></div>
            <p className="ac-loading-text">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="ac-empty ac-empty--error">
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
            <div className="ac-empty-title">Error Loading Categories</div>
            <div className="ac-empty-desc">{error}</div>
            <button className="ac-retry-btn" onClick={fetchCategories}>
              Retry
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="ac-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <div className="ac-empty-title">No categories found</div>
            <div className="ac-empty-desc">
              {search || statusFilter !== "all"
                ? "No categories match your active filters. Try clearing search or status."
                : "The hardware category registry is currently empty. Click '+ Add Category' to register your first component category."}
            </div>
            {!search && statusFilter === "all" && (
              <button className="ac-add-btn" onClick={handleOpenAddModal}>
                + Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="ac-table-wrap">
            <table className="ac-table">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>CATEGORY NAME</th>
                  <th style={{ width: "36%" }}>DESCRIPTION</th>
                  <th style={{ width: "16%" }}>PRODUCT COUNT</th>
                  <th style={{ width: "12%" }}>STATUS</th>
                  <th style={{ width: "10%" }} className="ac-th-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    {/* Category Name */}
                    <td>
                      <div className="ac-cat-cell">
                        <span className="ac-row-dot" />
                        <span className="ac-cat-name" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td>
                      <span className="ac-desc-text" title={cat.description}>
                        {cat.description || "—"}
                      </span>
                    </td>

                    {/* Product Count */}
                    <td>
                      <span className="ac-count-badge">
                        {cat.product_count !== undefined ? cat.product_count : 0}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span
                        className={`ac-status-badge ${
                          cat.status ? "ac-status-badge--active" : "ac-status-badge--inactive"
                        }`}
                      >
                        {cat.status ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="ac-actions">
                        <button
                          className="ac-icon-btn ac-icon-btn--edit"
                          title="Edit Category"
                          onClick={() => handleOpenEditModal(cat)}
                          aria-label={`Edit ${cat.name}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        <button
                          className="ac-icon-btn ac-icon-btn--delete"
                          title="Delete Category"
                          onClick={() => handleOpenDeleteModal(cat)}
                          aria-label={`Delete ${cat.name}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
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

        {/* ── Pagination ───────────────────────────────────────────── */}
        {!loading && !error && categories.length > 0 && (
          <div className="ac-pagination">
            <span className="ac-pagination-info">
              Showing <strong className="ac-white-text">{rangeStart}</strong> to{" "}
              <strong className="ac-white-text">{rangeEnd}</strong> of{" "}
              <strong className="ac-white-text">{totalCount}</strong> results
            </span>

            <div className="ac-pagination-controls">
              <button
                className="ac-page-nav-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`ac-page-num-btn ${
                    pageNum === currentPage ? "ac-page-num-btn--active" : ""
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="ac-page-nav-btn"
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

      {/* ── Add New Category Modal (Figma design) ───────────────────── */}
      {isAddModalOpen && (
        <div className="ac-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ac-modal-header">
              <div className="ac-modal-title-wrap">
                <span className="ac-modal-title-dot" />
                <h2 className="ac-modal-title">Add New Category</h2>
              </div>
              <button
                className="ac-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="ac-modal-body">
                {/* Field 1: Category Name */}
                <div className="ac-form-group">
                  <label className="ac-form-label" htmlFor="new-category-name">
                    CATEGORY NAME <span className="ac-required-star">*</span>
                  </label>
                  <input
                    id="new-category-name"
                    type="text"
                    className={`ac-form-input ${formErrors.name ? "ac-form-input--error" : ""}`}
                    placeholder="e.g. Graphics Cards, Processors, Cooling..."
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                    }}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className="ac-form-error-msg">{formErrors.name}</span>
                  )}
                </div>

                {/* Field 2: Description */}
                <div className="ac-form-group">
                  <label className="ac-form-label" htmlFor="new-category-desc">
                    DESCRIPTION
                  </label>
                  <textarea
                    id="new-category-desc"
                    className="ac-form-textarea"
                    rows="3"
                    placeholder="Brief description of the category and compatible PC components..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                {/* Field 3: Status Toggle */}
                <div className="ac-form-group">
                  <label className="ac-form-label">STATUS</label>
                  <div className="ac-toggle-container">
                    <span
                      className={`ac-toggle-label ${
                        !formData.status ? "ac-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: false })}
                    >
                      Inactive
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.status}
                      className={`ac-toggle-switch ${
                        formData.status ? "ac-toggle-switch--active" : ""
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, status: !formData.status })
                      }
                    >
                      <span className="ac-toggle-knob" />
                    </button>

                    <span
                      className={`ac-toggle-label ${
                        formData.status ? "ac-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: true })}
                    >
                      Active
                      {formData.status && <span className="ac-active-dot" />}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="ac-modal-footer">
                <button
                  type="button"
                  className="ac-btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-save"
                  disabled={submitting}
                  id="submit-category-btn"
                >
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Category Modal (Figma design) ──────────────────────── */}
      {isEditModalOpen && (
        <div className="ac-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ac-modal-header ac-modal-header--column">
              <div className="ac-modal-header-top">
                <h2 className="ac-modal-title">Edit Category</h2>
                <button
                  className="ac-modal-close"
                  onClick={() => setIsEditModalOpen(false)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <p className="ac-modal-subtitle">
                Update category information and status.
              </p>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="ac-modal-body">
                {/* Field 1: Category Name */}
                <div className="ac-form-group">
                  <label className="ac-form-label" htmlFor="edit-category-name">
                    CATEGORY NAME <span className="ac-required-star">*</span>
                  </label>
                  <input
                    id="edit-category-name"
                    type="text"
                    className={`ac-form-input ${formErrors.name ? "ac-form-input--error" : ""}`}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                    }}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className="ac-form-error-msg">{formErrors.name}</span>
                  )}
                </div>

                {/* Field 2: Description */}
                <div className="ac-form-group">
                  <label className="ac-form-label" htmlFor="edit-category-desc">
                    DESCRIPTION
                  </label>
                  <textarea
                    id="edit-category-desc"
                    className="ac-form-textarea"
                    rows="3"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                {/* Field 3: Status Toggle */}
                <div className="ac-form-group">
                  <label className="ac-form-label">STATUS</label>
                  <div className="ac-toggle-container">
                    <span
                      className={`ac-toggle-label ${
                        !formData.status ? "ac-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: false })}
                    >
                      Inactive
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.status}
                      className={`ac-toggle-switch ${
                        formData.status ? "ac-toggle-switch--active" : ""
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, status: !formData.status })
                      }
                    >
                      <span className="ac-toggle-knob" />
                    </button>

                    <span
                      className={`ac-toggle-label ${
                        formData.status ? "ac-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: true })}
                    >
                      Active
                      {formData.status && <span className="ac-active-dot" />}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="ac-modal-footer">
                <button
                  type="button"
                  className="ac-btn-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-btn-save"
                  disabled={submitting}
                  id="update-category-btn"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      {isDeleteModalOpen && currentCategory && (
        <div className="ac-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ac-modal-header">
              <div className="ac-modal-title-wrap">
                <span className="ac-modal-title-dot" />
                <h2 className="ac-modal-title">Delete Category</h2>
              </div>
              <button
                className="ac-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="ac-modal-body">
              {currentCategory.product_count > 0 ? (
                <div className="ac-delete-blocked-box">
                  <div className="ac-delete-blocked-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="ac-delete-blocked-title">Deletion Blocked</h4>
                    <p className="ac-delete-blocked-msg">
                      Cannot delete category <strong>"{currentCategory.name}"</strong>{" "}
                      because it contains{" "}
                      <strong>{currentCategory.product_count}</strong> product
                      {currentCategory.product_count === 1 ? "" : "s"}. Reassign or
                      remove the products first.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="ac-modal-text">
                  Are you sure you want to delete category{" "}
                  <strong>"{currentCategory.name}"</strong>? This action cannot be
                  undone.
                </p>
              )}
            </div>

            <div className="ac-modal-footer">
              <button
                type="button"
                className="ac-btn-cancel"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
              >
                {currentCategory.product_count > 0 ? "Close" : "Cancel"}
              </button>
              {currentCategory.product_count === 0 && (
                <button
                  type="button"
                  className="ac-btn-delete-confirm"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  id="confirm-delete-category-btn"
                >
                  {deleting ? "Deleting..." : "Delete Category"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
