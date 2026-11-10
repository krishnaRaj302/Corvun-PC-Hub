import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
} from "../../services/adminBannerService";
import "./AdminBanners.css";

/* ─── Helpers ──────────────────────────────────────────────── */
const BACKEND_BASE = "http://127.0.0.1:8002";

export const getImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/media/")) {
    return `${BACKEND_BASE}${path}`;
  }
  return `${BACKEND_BASE}/media/${path.replace(/^\/+/, "")}`;
};

export const formatDatesDisplay = (startDate, endDate) => {
  if (!startDate && !endDate) return "—";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const parseDate = (dStr) => {
    if (!dStr) return null;
    const parts = dStr.split("-");
    if (parts.length === 3) {
      const day = parts[2].padStart(2, "0");
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${day} ${months[monthIdx] || ""}`;
    }
    return dStr;
  };

  const startFmt = parseDate(startDate);
  const endFmt = parseDate(endDate);

  if (startFmt && endFmt) {
    return `${startFmt} - ${endFmt}`;
  }
  if (startFmt) {
    return `From ${startFmt}`;
  }
  if (endFmt) {
    return `Until ${endFmt}`;
  }
  return "—";
};

const PAGE_SIZE = 10;

export default function AdminBanners() {
  /* ── State ─────────────────────────────────────────────────── */
  const [banners, setBanners] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ── Modal States ──────────────────────────────────────────── */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [activeBanner, setActiveBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /* ── Form Data ─────────────────────────────────────────────── */
  const [formData, setFormData] = useState({
    title: "",
    cta_text: "Shop Now",
    link: "/products",
    start_date: "",
    end_date: "",
    status: "active",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

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

  /* ── Fetch Banners ─────────────────────────────────────────── */
  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminBanners({
        page: currentPage,
        page_size: PAGE_SIZE,
      });
      setBanners(data.banners || []);
      setTotalCount(data.count !== undefined ? data.count : (data.banners?.length || 0));
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error("Fetch banners error:", err);
      setError(
        err.response?.data?.error || "Failed to load banners from PostgreSQL database."
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  /* ── File Validation ───────────────────────────────────────── */
  const handleValidateFile = (file) => {
    if (!file) return null;

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExts = ["png", "jpg", "jpeg", "webp"];

    if (!allowed.includes(file.type) && !allowedExts.includes(ext)) {
      return "Invalid file format. Allowed formats: PNG, JPG, JPEG, WEBP.";
    }

    if (file.size > 5 * 1024 * 1024) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum 5MB limit.`;
    }

    return null;
  };

  const handleFileSelect = (file) => {
    const validationError = handleValidateFile(file);
    if (validationError) {
      setFormErrors((prev) => ({ ...prev, image: validationError }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, image: null }));
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  /* ── Drag & Drop Handlers ──────────────────────────────────── */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  /* ── Open Add Modal ────────────────────────────────────────── */
  const handleOpenAddModal = () => {
    setFormData({
      title: "",
      cta_text: "Shop Now",
      link: "/products",
      start_date: "",
      end_date: "",
      status: "active",
    });
    setSelectedFile(null);
    setFilePreview(null);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  /* ── Open Edit Modal ───────────────────────────────────────── */
  const handleOpenEditModal = (banner) => {
    setActiveBanner(banner);
    setFormData({
      title: banner.title || "",
      cta_text: banner.cta_text || "Shop Now",
      link: banner.link || "/products",
      start_date: banner.start_date || "",
      end_date: banner.end_date || "",
      status: banner.status || "active",
    });
    setSelectedFile(null);
    setFilePreview(null);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  /* ── Open Delete Modal ─────────────────────────────────────── */
  const handleOpenDeleteModal = (banner) => {
    setActiveBanner(banner);
    setIsDeleteModalOpen(true);
  };

  /* ── Client Validation ─────────────────────────────────────── */
  const validateForm = (isEdit = false) => {
    const errors = {};

    if (!isEdit && !selectedFile) {
      errors.image = "Banner image is required.";
    }

    if (!formData.title.trim()) {
      errors.title = "Banner title cannot be empty.";
    } else if (formData.title.trim().length < 2) {
      errors.title = "Banner title must contain at least 2 characters.";
    }

    if (formData.start_date && formData.end_date) {
      if (formData.end_date < formData.start_date) {
        errors.end_date = "End date cannot be earlier than start date.";
      }
    }

    return errors;
  };

  /* ── Submit Add Banner ─────────────────────────────────────── */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(false);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("cta_text", formData.cta_text.trim() || "Shop Now");
      payload.append("link", formData.link.trim() || "/products");
      payload.append("status", formData.status);
      if (formData.start_date) payload.append("start_date", formData.start_date);
      if (formData.end_date) payload.append("end_date", formData.end_date);
      if (selectedFile) payload.append("image", selectedFile);

      await createAdminBanner(payload);
      showToast("Banner created successfully.", "success");
      setIsAddModalOpen(false);
      fetchBanners();
    } catch (err) {
      console.error("Create banner error:", err);
      const apiErrors = err.response?.data;
      if (apiErrors && typeof apiErrors === "object") {
        setFormErrors(apiErrors);
        if (apiErrors.error) showToast(apiErrors.error, "error");
      } else {
        showToast("Failed to create banner. Please verify inputs.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Submit Edit Banner ────────────────────────────────────── */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeBanner) return;

    const errors = validateForm(true);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("cta_text", formData.cta_text.trim() || "Shop Now");
      payload.append("link", formData.link.trim() || "/products");
      payload.append("status", formData.status);
      if (formData.start_date) payload.append("start_date", formData.start_date);
      if (formData.end_date) payload.append("end_date", formData.end_date);
      if (selectedFile) {
        payload.append("image", selectedFile);
      }

      await updateAdminBanner(activeBanner.id, payload);
      showToast("Banner updated successfully.", "success");
      setIsEditModalOpen(false);
      fetchBanners();
    } catch (err) {
      console.error("Update banner error:", err);
      const apiErrors = err.response?.data;
      if (apiErrors && typeof apiErrors === "object") {
        setFormErrors(apiErrors);
        if (apiErrors.error) showToast(apiErrors.error, "error");
      } else {
        showToast("Failed to update banner. Please check fields.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Confirm Delete Banner ─────────────────────────────────── */
  const handleDeleteConfirm = async () => {
    if (!activeBanner) return;
    setSubmitting(true);
    try {
      await deleteAdminBanner(activeBanner.id);
      showToast(`Banner "${activeBanner.title}" deleted successfully.`, "success");
      setIsDeleteModalOpen(false);
      if (banners.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchBanners();
      }
    } catch (err) {
      console.error("Delete banner error:", err);
      showToast(err.response?.data?.error || "Failed to delete banner.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bm-page">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toast.show && (
        <div className={`bm-toast bm-toast--${toast.type}`}>
          <div className="bm-toast-content">
            <span className="bm-toast-indicator" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="bm-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header (Exact Figma Top) ──────────────────────── */}
      <div className="bm-header">
        <div className="bm-header-left">
          <h1 className="bm-title">Banner Management</h1>
          <p className="bm-subtitle">
            Create and manage your home page banners.
          </p>
        </div>
        <div className="bm-header-right">
          <button
            type="button"
            className="bm-add-btn"
            onClick={handleOpenAddModal}
            id="bm-add-banner-btn"
          >
            <svg
              width="15"
              height="15"
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
            <span>Add New Banner</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <div className="bm-error-banner">
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
            className="bm-retry-btn"
            onClick={fetchBanners}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Banner Table Card (Exact Figma Layout) ─────────────── */}
      <div className="bm-card">
        {loading ? (
          <div className="bm-loading">
            <div className="bm-spinner" />
            <p className="bm-loading-text">Loading banners from PostgreSQL…</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="bm-empty">
            <svg
              className="bm-empty-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <div className="bm-empty-title">No banners found.</div>
            <div className="bm-empty-desc">
              Create and manage banners using the "+ Add New Banner" button above.
            </div>
          </div>
        ) : (
          <div className="bm-table-wrap">
            <table className="bm-table">
              <thead>
                <tr>
                  <th>IMAGE</th>
                  <th>TITLE</th>
                  <th>CTA</th>
                  <th>STATUS</th>
                  <th>DATES</th>
                  <th className="bm-th-actions">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b) => {
                  const isActive = (b.status || "active").toLowerCase() === "active";
                  const imageUrl = getImageUrl(b.image);

                  return (
                    <tr key={b.id} className="bm-table-row">
                      {/* IMAGE Column */}
                      <td className="bm-col-image">
                        <div className="bm-thumb-wrap">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={b.title}
                              className="bm-thumb-img"
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="bm-thumb-placeholder"
                            style={{ display: imageUrl ? "none" : "flex" }}
                          >
                            <span>CORVUN</span>
                          </div>
                        </div>
                      </td>

                      {/* TITLE Column */}
                      <td className="bm-col-title">
                        <span className="bm-banner-title">{b.title}</span>
                      </td>

                      {/* CTA Column */}
                      <td className="bm-col-cta">
                        <span className="bm-banner-cta">
                          {b.cta_text || "Shop Now"}
                        </span>
                      </td>

                      {/* STATUS Column */}
                      <td className="bm-col-status">
                        <span
                          className={`bm-status-pill ${
                            isActive
                              ? "bm-status-pill--active"
                              : "bm-status-pill--inactive"
                          }`}
                        >
                          <span className="bm-status-dot" />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </span>
                      </td>

                      {/* DATES Column */}
                      <td className="bm-col-dates">
                        <span className="bm-banner-dates">
                          {formatDatesDisplay(b.start_date, b.end_date)}
                        </span>
                      </td>

                      {/* ACTIONS Column */}
                      <td className="bm-col-actions">
                        <div className="bm-action-buttons">
                          {/* Edit Action Icon */}
                          <button
                            type="button"
                            className="bm-icon-btn bm-icon-btn--edit"
                            onClick={() => handleOpenEditModal(b)}
                            title="Edit banner"
                            aria-label={`Edit banner ${b.title}`}
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
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>

                          {/* Delete Action Icon */}
                          <button
                            type="button"
                            className="bm-icon-btn bm-icon-btn--delete"
                            onClick={() => handleOpenDeleteModal(b)}
                            title="Delete banner"
                            aria-label={`Delete banner ${b.title}`}
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
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

        {/* ── Table Footer / Pagination (Exact Figma Style) ───── */}
        <div className="bm-pagination">
          <div className="bm-pagination-left">
            Showing {totalCount} banner{totalCount === 1 ? "" : "s"}
          </div>
          <div className="bm-pagination-right">
            <button
              type="button"
              className="bm-page-nav-btn"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="bm-page-number-active">{currentPage}</span>
            <button
              type="button"
              className="bm-page-nav-btn"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL 1: ADD NEW BANNER (Exact Figma Screenshot 2)
          ══════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div
          className="bm-modal-backdrop"
          onClick={() => !submitting && setIsAddModalOpen(false)}
        >
          <div
            className="bm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bm-modal-header">
              <h2 className="bm-modal-title">Add New Banner</h2>
              <button
                type="button"
                className="bm-modal-close"
                onClick={() => !submitting && setIsAddModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="bm-modal-form" noValidate>
              {/* BANNER IMAGE UPLOAD */}
              <div className="bm-form-group">
                <label className="bm-form-label">Banner Image</label>
                <div
                  className={`bm-dropzone ${isDragging ? "bm-dropzone--dragging" : ""} ${
                    formErrors.image ? "bm-dropzone--error" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="bm-file-input-hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {filePreview ? (
                    <div className="bm-dropzone-preview">
                      <img
                        src={filePreview}
                        alt="Selected preview"
                        className="bm-preview-image"
                      />
                      <div className="bm-preview-meta">
                        <span className="bm-preview-filename">{selectedFile?.name}</span>
                        <span className="bm-preview-change">Click or drop to replace</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bm-dropzone-content">
                      <div className="bm-cloud-icon-wrap">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                          <polyline points="12 12 12 17" />
                          <polyline points="9 14 12 11 15 14" />
                        </svg>
                      </div>
                      <p className="bm-dropzone-text">
                        Drag & drop banner image here
                      </p>
                      <p className="bm-dropzone-subtext">
                        Recommended size: 1200×400px
                      </p>
                      <button
                        type="button"
                        className="bm-dropzone-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Upload File
                      </button>
                    </div>
                  )}
                </div>
                {formErrors.image && (
                  <span className="bm-form-error">{formErrors.image}</span>
                )}
              </div>

              {/* BANNER TITLE */}
              <div className="bm-form-group">
                <label className="bm-form-label">Banner Title</label>
                <input
                  type="text"
                  className={`bm-input ${formErrors.title ? "bm-input--error" : ""}`}
                  placeholder="e.g., Summer Sale is Here!"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: null });
                  }}
                />
                {formErrors.title && (
                  <span className="bm-form-error">{formErrors.title}</span>
                )}
              </div>

              {/* CALL-TO-ACTION TEXT */}
              <div className="bm-form-group">
                <label className="bm-form-label">Call-to-Action Text</label>
                <input
                  type="text"
                  className="bm-input"
                  placeholder="e.g., Shop Now"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                />
              </div>

              {/* START DATE & END DATE */}
              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label className="bm-form-label">Start Date</label>
                  <input
                    type="date"
                    className="bm-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="bm-form-group">
                  <label className="bm-form-label">End Date</label>
                  <input
                    type="date"
                    className={`bm-input ${formErrors.end_date ? "bm-input--error" : ""}`}
                    min={formData.start_date || undefined}
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: null });
                    }}
                  />
                  {formErrors.end_date && (
                    <span className="bm-form-error">{formErrors.end_date}</span>
                  )}
                </div>
              </div>

              {/* STATUS TOGGLE */}
              <div className="bm-form-group">
                <label className="bm-form-label">Status</label>
                <div className="bm-toggle-row">
                  <span
                    className={`bm-toggle-text ${
                      formData.status === "inactive" ? "bm-toggle-text--selected" : ""
                    }`}
                  >
                    Inactive
                  </span>
                  <button
                    type="button"
                    className={`bm-switch ${
                      formData.status === "active" ? "bm-switch--active" : ""
                    }`}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        status: formData.status === "active" ? "inactive" : "active",
                      })
                    }
                    role="switch"
                    aria-checked={formData.status === "active"}
                  >
                    <span className="bm-switch-thumb" />
                  </button>
                  <span
                    className={`bm-toggle-text ${
                      formData.status === "active" ? "bm-toggle-text--selected" : ""
                    }`}
                  >
                    Active
                  </span>
                </div>
              </div>

              {/* MODAL ACTIONS FOOTER */}
              <div className="bm-modal-footer">
                <button
                  type="button"
                  className="bm-btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2: EDIT BANNER (Exact Figma Screenshot 3)
          ══════════════════════════════════════════════════════════ */}
      {isEditModalOpen && activeBanner && (
        <div
          className="bm-modal-backdrop"
          onClick={() => !submitting && setIsEditModalOpen(false)}
        >
          <div
            className="bm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bm-modal-header">
              <h2 className="bm-modal-title">Edit Banner</h2>
              <button
                type="button"
                className="bm-modal-close"
                onClick={() => !submitting && setIsEditModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="bm-modal-form" noValidate>
              {/* CURRENT BANNER IMAGE */}
              <div className="bm-form-group">
                <label className="bm-form-label">Current Banner Image</label>
                <div className="bm-current-image-box">
                  <img
                    src={filePreview || getImageUrl(activeBanner.image)}
                    alt={activeBanner.title}
                    className="bm-current-preview-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="bm-file-input-hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  className="bm-change-image-link"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Image
                </button>
                {selectedFile && (
                  <span className="bm-new-file-selected">
                    New file selected: {selectedFile.name}
                  </span>
                )}
                {formErrors.image && (
                  <span className="bm-form-error">{formErrors.image}</span>
                )}
              </div>

              {/* BANNER TITLE */}
              <div className="bm-form-group">
                <label className="bm-form-label">Banner Title</label>
                <input
                  type="text"
                  className={`bm-input ${formErrors.title ? "bm-input--error" : ""}`}
                  placeholder="Banner Title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: null });
                  }}
                />
                {formErrors.title && (
                  <span className="bm-form-error">{formErrors.title}</span>
                )}
              </div>

              {/* CALL-TO-ACTION TEXT */}
              <div className="bm-form-group">
                <label className="bm-form-label">Call-to-Action Text</label>
                <input
                  type="text"
                  className="bm-input"
                  placeholder="e.g., Shop Now"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                />
              </div>

              {/* START DATE & END DATE */}
              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label className="bm-form-label">Start Date</label>
                  <input
                    type="date"
                    className="bm-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="bm-form-group">
                  <label className="bm-form-label">End Date</label>
                  <input
                    type="date"
                    className={`bm-input ${formErrors.end_date ? "bm-input--error" : ""}`}
                    min={formData.start_date || undefined}
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: null });
                    }}
                  />
                  {formErrors.end_date && (
                    <span className="bm-form-error">{formErrors.end_date}</span>
                  )}
                </div>
              </div>

              {/* STATUS TOGGLE */}
              <div className="bm-form-group">
                <label className="bm-form-label">Status</label>
                <div className="bm-toggle-row">
                  <span
                    className={`bm-toggle-text ${
                      formData.status === "inactive" ? "bm-toggle-text--selected" : ""
                    }`}
                  >
                    Inactive
                  </span>
                  <button
                    type="button"
                    className={`bm-switch ${
                      formData.status === "active" ? "bm-switch--active" : ""
                    }`}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        status: formData.status === "active" ? "inactive" : "active",
                      })
                    }
                    role="switch"
                    aria-checked={formData.status === "active"}
                  >
                    <span className="bm-switch-thumb" />
                  </button>
                  <span
                    className={`bm-toggle-text ${
                      formData.status === "active" ? "bm-toggle-text--selected" : ""
                    }`}
                  >
                    Active
                  </span>
                </div>
              </div>

              {/* MODAL ACTIONS FOOTER */}
              <div className="bm-modal-footer">
                <button
                  type="button"
                  className="bm-btn-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 3: DELETE CONFIRMATION (Exact Figma Screenshot 4)
          ══════════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && activeBanner && (
        <div
          className="bm-modal-backdrop"
          onClick={() => !submitting && setIsDeleteModalOpen(false)}
        >
          <div
            className="bm-modal bm-modal--delete"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            {/* Alert Icon */}
            <div className="bm-delete-icon-wrap">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 className="bm-delete-title">Confirm Banner Deletion</h2>

            <p className="bm-delete-text">
              Are you sure you want to permanently delete the banner{" "}
              <strong>"{activeBanner.title}"</strong>? This action is
              irreversible and cannot be undone.
            </p>

            <div className="bm-delete-actions">
              <button
                type="button"
                className="bm-btn-cancel bm-btn-cancel--delete"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bm-btn-danger"
                onClick={handleDeleteConfirm}
                disabled={submitting}
              >
                {submitting ? "Deleting..." : "Delete Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
