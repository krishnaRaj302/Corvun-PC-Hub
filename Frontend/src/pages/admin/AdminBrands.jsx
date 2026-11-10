import { useState, useEffect, useCallback, useRef } from "react";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../../services/adminBrandService";
import "./AdminBrands.css";

export default function AdminBrands() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [brands, setBrands] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8; // Per Figma layout: 8 items per page

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ── Modals State ──────────────────────────────────────────────────── */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentBrand, setCurrentBrand] = useState(null);

  /* ── Form State ────────────────────────────────────────────────────── */
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    status: "listed", // "listed" | "unlisted"
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

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

  /* ── Fetch Brands ─────────────────────────────────────────────────── */
  const fetchBrands = useCallback(async () => {
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

      const data = await getBrands(params);
      const results = data.results || (Array.isArray(data) ? data : []);
      setBrands(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);
    } catch (err) {
      console.error("AdminBrands fetch error:", err);
      setError("Unable to load brands. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  /* ── Filter Handlers ──────────────────────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  /* ── File Selection & Preview ─────────────────────────────────────── */
  const handleFileChange = (file) => {
    if (!file) return;

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      showToast("Please select a valid image file (PNG, JPG, WEBP, SVG).", "error");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Logo file size must be less than 5MB.", "error");
      return;
    }

    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /* ── Modal Open Handlers ─────────────────────────────────────────── */
  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      logo: "",
      status: "listed",
    });
    setLogoFile(null);
    setLogoPreview("");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (brand) => {
    setCurrentBrand(brand);
    setFormData({
      name: brand.name,
      logo: brand.logo || "",
      status: brand.status || "listed",
    });
    setLogoFile(null);
    setLogoPreview(brand.logo || "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (brand) => {
    setCurrentBrand(brand);
    setIsDeleteModalOpen(true);
  };

  /* ── Form Validation ──────────────────────────────────────────────── */
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Brand name is required.";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Brand name must contain at least 2 characters.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Save (Create / Update) ───────────────────────────────────────── */
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let payload;
      if (logoFile) {
        payload = new FormData();
        payload.append("name", formData.name.trim());
        payload.append("status", formData.status);
        payload.append("logo", logoFile);
      } else {
        payload = {
          name: formData.name.trim(),
          status: formData.status,
          logo: formData.logo || "",
        };
      }

      if (isEditModalOpen && currentBrand) {
        await updateBrand(currentBrand.id, payload);
        showToast(`Brand "${formData.name.trim()}" updated successfully.`);
        setIsEditModalOpen(false);
      } else {
        await createBrand(payload);
        showToast(`Brand "${formData.name.trim()}" created successfully.`);
        setIsAddModalOpen(false);
      }

      fetchBrands();
    } catch (err) {
      console.error("Save brand error:", err);
      const resErrors = err.response?.data;
      if (resErrors && typeof resErrors === "object") {
        if (resErrors.name) {
          setFormErrors({
            name: Array.isArray(resErrors.name) ? resErrors.name[0] : resErrors.name,
          });
        } else if (resErrors.error) {
          showToast(resErrors.error, "error");
        } else {
          showToast("Failed to save brand. Please check your inputs.", "error");
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
    if (!currentBrand) return;
    if (currentBrand.product_count > 0) {
      showToast(
        "Cannot delete this brand because products are currently associated with it.",
        "error"
      );
      return;
    }

    setDeleting(true);
    try {
      await deleteBrand(currentBrand.id);
      showToast(`Brand "${currentBrand.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setCurrentBrand(null);
      fetchBrands();
    } catch (err) {
      console.error("Delete brand error:", err);
      const errMsg =
        err.response?.data?.error ||
        "Cannot delete this brand because products are currently associated with it.";
      showToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const getBrandInitial = (name) => {
    if (!name) return "B";
    const parts = name.trim().split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 3).toUpperCase();
  };

  const getFullLogoUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
      return path;
    }
    return `http://127.0.0.1:8002${path.startsWith("/") ? "" : "/"}${path}`;
  };

  /* ── Pagination Calculations ──────────────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="ab-page">
      {/* ── Toast Notification ─────────────────────────────────────── */}
      {toast.show && (
        <div className={`ab-toast ${toast.type === "error" ? "ab-toast--error" : ""}`}>
          <div className="ab-toast-content">
            <span className="ab-toast-indicator"></span>
            <span>{toast.message}</span>
          </div>
          <button
            className="ab-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
            aria-label="Close toast"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Header (Figma) ─────────────────────────────────────────── */}
      <div className="ab-header">
        <div className="ab-header-left">
          <h1 className="ab-title">Brands Management</h1>
          <p className="ab-subtitle">
            Manage all hardware brands available on Corvun.
          </p>
        </div>

        <button className="ab-add-btn" onClick={handleOpenAddModal} id="add-brand-btn">
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
          Add Brand
        </button>
      </div>

      {/* ── Filter Bar (Figma) ─────────────────────────────────────── */}
      <div className="ab-filter-bar">
        <div className="ab-search-wrap">
          <svg
            className="ab-search-icon"
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
            className="ab-search-input"
            placeholder="Search by brand name..."
            value={search}
            onChange={handleSearchChange}
            id="brand-search-input"
          />
        </div>

        <div className="ab-select-wrap">
          <select
            className="ab-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            id="brand-status-filter"
          >
            <option value="all">All</option>
            <option value="listed">Listed</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </div>
      </div>

      {/* ── Table Container (Figma) ────────────────────────────────── */}
      <div className="ab-card">
        {loading ? (
          <div className="ab-loading-container">
            <div className="ab-spinner"></div>
            <p className="ab-loading-text">Loading brands...</p>
          </div>
        ) : error ? (
          <div className="ab-empty ab-empty--error">
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
            <div className="ab-empty-title">Error Loading Brands</div>
            <div className="ab-empty-desc">{error}</div>
            <button className="ab-retry-btn" onClick={fetchBrands}>
              Retry
            </button>
          </div>
        ) : brands.length === 0 ? (
          <div className="ab-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div className="ab-empty-title">No brands found.</div>
            <div className="ab-empty-desc">
              {search || statusFilter !== "all"
                ? "No brands match your current search or status filter."
                : "No hardware brands are currently registered. Click '+ Add Brand' to register a new manufacturer."}
            </div>
            {!search && statusFilter === "all" && (
              <button className="ab-add-btn" onClick={handleOpenAddModal}>
                + Add Brand
              </button>
            )}
          </div>
        ) : (
          <div className="ab-table-wrap">
            <table className="ab-table">
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>BRAND LOGO</th>
                  <th style={{ width: "34%" }}>BRAND NAME</th>
                  <th style={{ width: "20%" }}>PRODUCT COUNT</th>
                  <th style={{ width: "16%" }}>STATUS</th>
                  <th style={{ width: "14%" }} className="ab-th-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => {
                  const isListed = brand.status === "listed";
                  return (
                    <tr key={brand.id}>
                      {/* Brand Logo */}
                      <td>
                        <div className="ab-logo-container">
                          {brand.logo ? (
                            <img
                              src={getFullLogoUrl(brand.logo)}
                              alt={brand.name}
                              className="ab-logo-img"
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="ab-logo-fallback"
                            style={{ display: brand.logo ? "none" : "flex" }}
                          >
                            <span>{getBrandInitial(brand.name)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Brand Name */}
                      <td>
                        <span className="ab-brand-name" title={brand.name}>
                          {brand.name}
                        </span>
                      </td>

                      {/* Product Count */}
                      <td>
                        <span className="ab-count-text">
                          {brand.product_count !== undefined ? brand.product_count : 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`ab-status-badge ${
                            isListed ? "ab-status-badge--listed" : "ab-status-badge--unlisted"
                          }`}
                        >
                          {isListed ? "Listed" : "Unlisted"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="ab-actions">
                          <button
                            className="ab-icon-btn ab-icon-btn--edit"
                            title="Edit Brand"
                            onClick={() => handleOpenEditModal(brand)}
                            aria-label={`Edit ${brand.name}`}
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
                            className="ab-icon-btn ab-icon-btn--delete"
                            title="Delete Brand"
                            onClick={() => handleOpenDeleteModal(brand)}
                            aria-label={`Delete ${brand.name}`}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination (Figma) ───────────────────────────────────── */}
        {!loading && !error && brands.length > 0 && (
          <div className="ab-pagination">
            <span className="ab-pagination-info">
              Showing <strong className="ab-white-text">{rangeStart}</strong> to{" "}
              <strong className="ab-white-text">{rangeEnd}</strong> of{" "}
              <strong className="ab-white-text">{totalCount}</strong> results
            </span>

            <div className="ab-pagination-controls">
              <button
                className="ab-page-nav-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`ab-page-num-btn ${
                    pageNum === currentPage ? "ab-page-num-btn--active" : ""
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="ab-page-nav-btn"
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

      {/* ── Add New Brand Modal (Figma) ────────────────────────────── */}
      {isAddModalOpen && (
        <div className="ab-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-header">
              <h2 className="ab-modal-title">Add New Brand</h2>
              <button
                className="ab-modal-close"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBrand}>
              <div className="ab-modal-body">
                {/* Field 1: Brand Name */}
                <div className="ab-form-group">
                  <label className="ab-form-label" htmlFor="new-brand-name">
                    Brand Name <span className="ab-required-star">*</span>
                  </label>
                  <input
                    id="new-brand-name"
                    type="text"
                    className={`ab-form-input ${formErrors.name ? "ab-form-input--error" : ""}`}
                    placeholder="Enter brand name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                    }}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className="ab-form-error-msg">{formErrors.name}</span>
                  )}
                </div>

                {/* Field 2: Brand Logo */}
                <div className="ab-form-group">
                  <label className="ab-form-label">Brand Logo</label>
                  <div
                    className="ab-upload-dropzone"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />

                    {logoPreview ? (
                      <div className="ab-upload-preview-wrap" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={getFullLogoUrl(logoPreview)}
                          alt="Logo preview"
                          className="ab-upload-preview-img"
                        />
                        <div className="ab-upload-preview-actions">
                          <button
                            type="button"
                            className="ab-btn-change-logo"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Change Logo
                          </button>
                          <button
                            type="button"
                            className="ab-btn-remove-logo"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview("");
                              setFormData({ ...formData, logo: "" });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="ab-upload-icon-circle">
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
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <p className="ab-upload-title">Drag & drop your logo here</p>
                        <p className="ab-upload-subtitle">or click to browse</p>
                        <button
                          type="button"
                          className="ab-upload-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Upload File
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Field 3: Status Toggle (Unlist / List) */}
                <div className="ab-form-group">
                  <label className="ab-form-label">Status</label>
                  <div className="ab-toggle-container">
                    <span
                      className={`ab-toggle-label ${
                        formData.status === "unlisted" ? "ab-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: "unlisted" })}
                    >
                      Unlist
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.status === "listed"}
                      className={`ab-toggle-switch ${
                        formData.status === "listed" ? "ab-toggle-switch--active" : ""
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          status: formData.status === "listed" ? "unlisted" : "listed",
                        })
                      }
                    >
                      <span className="ab-toggle-knob" />
                    </button>

                    <span
                      className={`ab-toggle-label ${
                        formData.status === "listed" ? "ab-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: "listed" })}
                    >
                      List
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="ab-modal-footer">
                <button
                  type="button"
                  className="ab-btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ab-btn-save"
                  disabled={submitting}
                  id="submit-brand-btn"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Brand Modal (Figma) ───────────────────────────────── */}
      {isEditModalOpen && (
        <div className="ab-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-header ab-modal-header--column">
              <div className="ab-modal-header-top">
                <h2 className="ab-modal-title">Edit Brand</h2>
                <button
                  className="ab-modal-close"
                  onClick={() => setIsEditModalOpen(false)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <p className="ab-modal-subtitle">Update brand information and status.</p>
            </div>

            <form onSubmit={handleSaveBrand}>
              <div className="ab-modal-body">
                {/* Field 1: Brand Name */}
                <div className="ab-form-group">
                  <label className="ab-form-label" htmlFor="edit-brand-name">
                    BRAND NAME <span className="ab-required-star">*</span>
                  </label>
                  <input
                    id="edit-brand-name"
                    type="text"
                    className={`ab-form-input ${formErrors.name ? "ab-form-input--error" : ""}`}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                    }}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className="ab-form-error-msg">{formErrors.name}</span>
                  )}
                </div>

                {/* Field 2: Brand Logo */}
                <div className="ab-form-group">
                  <label className="ab-form-label">BRAND LOGO</label>
                  <div
                    className="ab-upload-dropzone"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />

                    {logoPreview ? (
                      <div className="ab-upload-preview-wrap" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={getFullLogoUrl(logoPreview)}
                          alt="Logo preview"
                          className="ab-upload-preview-img"
                        />
                        <div className="ab-upload-preview-actions">
                          <button
                            type="button"
                            className="ab-btn-change-logo"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Change Logo
                          </button>
                          <button
                            type="button"
                            className="ab-btn-remove-logo"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview("");
                              setFormData({ ...formData, logo: "" });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="ab-upload-icon-circle">
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
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <p className="ab-upload-subtitle">Click to upload or drag and drop</p>
                        <button
                          type="button"
                          className="ab-btn-change-logo-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Change Logo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Field 3: Status Toggle (Unlist / List) */}
                <div className="ab-form-group">
                  <label className="ab-form-label">STATUS</label>
                  <div className="ab-toggle-container">
                    <span
                      className={`ab-toggle-label ${
                        formData.status === "unlisted" ? "ab-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: "unlisted" })}
                    >
                      Unlist
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.status === "listed"}
                      className={`ab-toggle-switch ${
                        formData.status === "listed" ? "ab-toggle-switch--active" : ""
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          status: formData.status === "listed" ? "unlisted" : "listed",
                        })
                      }
                    >
                      <span className="ab-toggle-knob" />
                    </button>

                    <span
                      className={`ab-toggle-label ${
                        formData.status === "listed" ? "ab-toggle-label--selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, status: "listed" })}
                    >
                      List
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="ab-modal-footer">
                <button
                  type="button"
                  className="ab-btn-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ab-btn-save"
                  disabled={submitting}
                  id="update-brand-btn"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Brand Deletion Modal (Figma) ───────────────────── */}
      {isDeleteModalOpen && currentBrand && (
        <div className="ab-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="ab-modal ab-modal--delete" onClick={(e) => e.stopPropagation()}>
            <div className="ab-delete-modal-body">
              {/* Alert Warning Icon in Circle */}
              <div className="ab-delete-icon-circle">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h2 className="ab-delete-title">Confirm Brand Deletion</h2>

              {currentBrand.product_count > 0 ? (
                <div className="ab-delete-blocked-box">
                  <p className="ab-delete-blocked-msg">
                    Cannot delete this brand because products are currently associated with it.
                    (<strong>{currentBrand.product_count}</strong> product
                    {currentBrand.product_count === 1 ? "" : "s"} found). Please reassign or
                    remove the associated products first.
                  </p>
                </div>
              ) : (
                <p className="ab-delete-text">
                  Are you sure you want to permanently delete the brand{" "}
                  <strong>"{currentBrand.name}"</strong>? This action is irreversible and
                  cannot be undone.
                </p>
              )}

              <div className="ab-delete-btn-group">
                <button
                  type="button"
                  className="ab-btn-cancel"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleting}
                >
                  {currentBrand.product_count > 0 ? "Close" : "Cancel"}
                </button>
                {currentBrand.product_count === 0 && (
                  <button
                    type="button"
                    className="ab-btn-delete-confirm"
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    id="confirm-delete-brand-btn"
                  >
                    {deleting ? "Deleting..." : "Delete Brand"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
