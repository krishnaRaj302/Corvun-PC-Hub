import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getAdminProductDetail,
  updateAdminProduct,
  createAdminVariant,
  deleteAdminVariant,
  createAdminImage,
  deleteAdminImage,
  createAdminSpecification,
  deleteAdminSpecification,
  getAdminCategories,
  getAdminBrands,
} from "../../../services/adminProductService";
import "./AdminProductForm.css";

const resolveImageUrl = (path) => {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  if (path.startsWith("/media/")) {
    return `http://127.0.0.1:8002${path}`;
  }
  return path;
};

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Categories & Brands for select
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Data
  const [formData, setFormData] = useState({
    product_name: "",
    sku: "",
    brand: "",
    category: "",
    description: "",
    base_price: "",
    stock: "0",
    low_stock_threshold: "5",
    status: "active",
  });

  // Dynamic Records
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [specifications, setSpecifications] = useState([]);

  // Original IDs to track deletions
  const [initialVariantIds, setInitialVariantIds] = useState([]);
  const [initialImageIds, setInitialImageIds] = useState([]);
  const [initialSpecIds, setInitialSpecIds] = useState([]);

  // State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Existing Product Data & Categories/Brands
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [cats, brs, detail] = await Promise.all([
          getAdminCategories(),
          getAdminBrands(),
          getAdminProductDetail(id),
        ]);

        setCategories(cats || []);
        setBrands(brs || []);

        const prod = detail.product;
        if (prod) {
          setFormData({
            product_name: prod.product_name || "",
            sku: prod.sku || "",
            brand: prod.brand || (cats[0]?.id ?? ""),
            category: prod.category || (brs[0]?.id ?? ""),
            description: prod.description || "",
            base_price: prod.base_price || "",
            stock: String(prod.stock ?? 0),
            low_stock_threshold: String(prod.low_stock_threshold ?? 5),
            status: prod.status || "active",
          });
        }

        const vList = detail.variants || [];
        setVariants(vList);
        setInitialVariantIds(vList.map((v) => v.id));

        const imgList = detail.images || [];
        setImages(imgList);
        setInitialImageIds(imgList.map((img) => img.id));

        const specList = detail.specifications || [];
        setSpecifications(specList);
        setInitialSpecIds(specList.map((s) => s.id));
      } catch (err) {
        console.error("Failed to load product detail for edit:", err);
        setGlobalError("Unable to fetch product details from server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Variants
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { variant_name: "", price: formData.base_price || "", stock: "0" },
    ]);
  };

  const handleUpdateVariant = (index, field, value) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Images
  const handleAddImage = () => {
    setImages((prev) => [
      ...prev,
      {
        image: "",
        file: null,
        previewUrl: "",
        image_type: prev.length === 0 ? "front" : "gallery",
        sort_order: prev.length + 1,
        isUrlMode: false,
      },
    ]);
  };

  const handleSingleFileSelect = (index, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        file,
        previewUrl,
        isUrlMode: false,
      };
      return copy;
    });
  };

  const handleBatchFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => {
      const newItems = files.map((file, i) => ({
        image: "",
        file,
        previewUrl: URL.createObjectURL(file),
        image_type: prev.length === 0 && i === 0 ? "front" : "gallery",
        sort_order: prev.length + i + 1,
        isUrlMode: false,
      }));
      return [...prev, ...newItems];
    });
    e.target.value = "";
  };

  const handleUpdateImage = (index, field, value) => {
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Specs
  const handleAddSpec = () => {
    setSpecifications((prev) => [
      ...prev,
      { specification_name: "", specification_value: "" },
    ]);
  };

  const handleUpdateSpec = (index, field, value) => {
    setSpecifications((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveSpec = (index) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.product_name.trim() || formData.product_name.trim().length < 2) {
      newErrors.product_name = "Product name must contain at least 2 characters.";
    }
    if (!formData.sku.trim()) {
      newErrors.sku = "A unique SKU identifier is required.";
    }
    if (!formData.brand) {
      newErrors.brand = "Please select a brand.";
    }
    if (!formData.category) {
      newErrors.category = "Please select a category.";
    }
    const priceNum = parseFloat(formData.base_price);
    if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.base_price = "Base price must be greater than 0.";
    }
    const stockNum = parseInt(formData.stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      newErrors.stock = "Stock units cannot be negative.";
    }
    const threshNum = parseInt(formData.low_stock_threshold, 10);
    if (isNaN(threshNum) || threshNum < 0) {
      newErrors.low_stock_threshold = "Low stock threshold cannot be negative.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Update Core Product
      const productPayload = {
        product_name: formData.product_name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        brand: Number(formData.brand),
        category: Number(formData.category),
        description: formData.description.trim(),
        base_price: parseFloat(formData.base_price).toFixed(2),
        stock: parseInt(formData.stock, 10),
        low_stock_threshold: parseInt(formData.low_stock_threshold, 10),
        status: formData.status,
      };

      await updateAdminProduct(id, productPayload);

      // 2. Handle Variants: delete removed ones, add new ones without id
      const currentVariantIds = variants.filter((v) => v.id).map((v) => v.id);
      const variantsToDelete = initialVariantIds.filter(
        (vid) => !currentVariantIds.includes(vid)
      );
      for (const vid of variantsToDelete) {
        try {
          await deleteAdminVariant(vid);
        } catch (err) {
          console.warn("Error removing variant:", err);
        }
      }
      for (const v of variants) {
        if (!v.id && v.variant_name.trim()) {
          await createAdminVariant({
            product: id,
            variant_name: v.variant_name.trim(),
            price: v.price ? parseFloat(v.price).toFixed(2) : null,
            stock: parseInt(v.stock, 10) || 0,
          });
        }
      }

      // 3. Handle Images: delete removed ones, add new ones with file or url
      const currentImageIds = images.filter((img) => img.id && !img.file).map((img) => img.id);
      const imagesToDelete = initialImageIds.filter(
        (imgId) => !currentImageIds.includes(imgId)
      );
      for (const imgId of imagesToDelete) {
        try {
          await deleteAdminImage(imgId);
        } catch (err) {
          console.warn("Error removing image:", err);
        }
      }
      for (const img of images) {
        if (img.file) {
          if (img.id) {
            try {
              await deleteAdminImage(img.id);
            } catch (err) {
              console.warn("Error deleting replaced image:", err);
            }
          }
          const imgData = new FormData();
          imgData.append("product", id);
          imgData.append("image", img.file);
          imgData.append("image_type", img.image_type || "gallery");
          imgData.append("sort_order", parseInt(img.sort_order, 10) || 0);
          await createAdminImage(imgData);
        } else if (!img.id && img.image && img.image.trim()) {
          await createAdminImage({
            product: id,
            image: img.image.trim(),
            image_type: img.image_type || "gallery",
            sort_order: parseInt(img.sort_order, 10) || 0,
          });
        }
      }

      // 4. Handle Specs: delete removed ones, add new ones without id
      const currentSpecIds = specifications.filter((s) => s.id).map((s) => s.id);
      const specsToDelete = initialSpecIds.filter(
        (sid) => !currentSpecIds.includes(sid)
      );
      for (const sid of specsToDelete) {
        try {
          await deleteAdminSpecification(sid);
        } catch (err) {
          console.warn("Error removing spec:", err);
        }
      }
      for (const s of specifications) {
        if (!s.id && s.specification_name.trim() && s.specification_value.trim()) {
          await createAdminSpecification({
            product: id,
            specification_name: s.specification_name.trim(),
            specification_value: s.specification_value.trim(),
          });
        }
      }

      navigate("/admin/products", {
        replace: true,
        state: { message: `Product "${formData.product_name}" updated successfully.` },
      });
    } catch (err) {
      console.error("Failed to update product:", err);
      let errMsg = "An error occurred while updating the product.";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errMsg = err.response.data;
        } else if (err.response.data.error) {
          errMsg = err.response.data.error;
        } else {
          const fieldErrors = Object.entries(err.response.data)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(" ") : errs}`)
            .join(" | ");
          errMsg = fieldErrors || errMsg;
        }
      }
      setGlobalError(errMsg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        color: "#8e95a5",
        fontFamily: "var(--corvun-mono)"
      }}>
        <div style={{
          width: "36px",
          height: "36px",
          border: "2px solid #20242e",
          borderTopColor: "#ef3842",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <span>LOADING PRODUCT SPECIFICATION #{id}...</span>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <div className="admin-form-header">
        <div className="admin-form-header-left">
          <div className="admin-breadcrumb">
            <Link to="/admin/products">Products</Link>
            <span>/</span>
            <span>Edit Product #{id}</span>
          </div>
          <h1 className="admin-form-title">Edit Product Specification</h1>
          <p className="admin-form-desc">
            Modify catalog details, pricing, inventory thresholds, variants, and image gallery.
          </p>
        </div>
      </div>

      {globalError && (
        <div className="admin-form-global-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1 */}
        <div className="admin-form-card">
          <div className="admin-form-section-header">
            <h2 className="admin-form-section-title">
              <span className="section-num">1</span>
              Product Identification & Categorization
            </h2>
          </div>

          <div className="admin-grid-2">
            <div className="admin-field-group">
              <label className="admin-label">
                Product Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`admin-field-input ${errors.product_name ? "has-error" : ""}`}
                value={formData.product_name}
                onChange={(e) => handleFieldChange("product_name", e.target.value)}
              />
              {errors.product_name && (
                <span className="admin-field-error">{errors.product_name}</span>
              )}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">
                SKU <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`admin-field-input ${errors.sku ? "has-error" : ""}`}
                value={formData.sku}
                onChange={(e) => handleFieldChange("sku", e.target.value)}
              />
              {errors.sku && <span className="admin-field-error">{errors.sku}</span>}
            </div>
          </div>

          <div className="admin-grid-3">
            <div className="admin-field-group">
              <label className="admin-label">
                Brand <span className="required-star">*</span>
              </label>
              <select
                className={`admin-field-select ${errors.brand ? "has-error" : ""}`}
                value={formData.brand}
                onChange={(e) => handleFieldChange("brand", e.target.value)}
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.brand && <span className="admin-field-error">{errors.brand}</span>}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">
                Category <span className="required-star">*</span>
              </label>
              <select
                className={`admin-field-select ${errors.category ? "has-error" : ""}`}
                value={formData.category}
                onChange={(e) => handleFieldChange("category", e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span className="admin-field-error">{errors.category}</span>
              )}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">Catalog Status</label>
              <select
                className="admin-field-select"
                value={formData.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
              >
                <option value="active">Active (Listed in Store)</option>
                <option value="inactive">Inactive (Hidden)</option>
                <option value="draft">Draft (Admin Only)</option>
              </select>
            </div>
          </div>

          <div className="admin-field-group">
            <label className="admin-label">Detailed Description</label>
            <textarea
              className="admin-field-textarea"
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
            />
          </div>
        </div>

        {/* Section 2 */}
        <div className="admin-form-card">
          <div className="admin-form-section-header">
            <h2 className="admin-form-section-title">
              <span className="section-num">2</span>
              Pricing & Stock Levels
            </h2>
          </div>

          <div className="admin-grid-3">
            <div className="admin-field-group">
              <label className="admin-label">
                Base Price (₹) <span className="required-star">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={`admin-field-input ${errors.base_price ? "has-error" : ""}`}
                value={formData.base_price}
                onChange={(e) => handleFieldChange("base_price", e.target.value)}
              />
              {errors.base_price && (
                <span className="admin-field-error">{errors.base_price}</span>
              )}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">
                Stock Units <span className="required-star">*</span>
              </label>
              <input
                type="number"
                min="0"
                className={`admin-field-input ${errors.stock ? "has-error" : ""}`}
                value={formData.stock}
                onChange={(e) => handleFieldChange("stock", e.target.value)}
              />
              {errors.stock && <span className="admin-field-error">{errors.stock}</span>}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">
                Low Stock Alert Threshold <span className="required-star">*</span>
              </label>
              <input
                type="number"
                min="0"
                className={`admin-field-input ${errors.low_stock_threshold ? "has-error" : ""}`}
                value={formData.low_stock_threshold}
                onChange={(e) => handleFieldChange("low_stock_threshold", e.target.value)}
              />
              {errors.low_stock_threshold && (
                <span className="admin-field-error">{errors.low_stock_threshold}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Variants */}
        <div className="admin-form-card">
          <div className="admin-form-section-header">
            <h2 className="admin-form-section-title">
              <span className="section-num">3</span>
              Product Variants
            </h2>
            <button
              type="button"
              className="admin-btn-add-row"
              onClick={handleAddVariant}
            >
              + Add Variant Row
            </button>
          </div>

          {variants.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#6d7588", fontStyle: "italic" }}>
              No variants defined.
            </p>
          ) : (
            <table className="admin-dynamic-table">
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Variant Name</th>
                  <th style={{ width: "25%" }}>Price (₹)</th>
                  <th style={{ width: "20%" }}>Stock Units</th>
                  <th style={{ width: "10%" }}></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="admin-dynamic-row-input"
                        value={v.variant_name || ""}
                        onChange={(e) =>
                          handleUpdateVariant(idx, "variant_name", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="admin-dynamic-row-input"
                        value={v.price ?? ""}
                        onChange={(e) => handleUpdateVariant(idx, "price", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="admin-dynamic-row-input"
                        value={v.stock ?? 0}
                        onChange={(e) => handleUpdateVariant(idx, "stock", e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn-remove-row"
                        onClick={() => handleRemoveVariant(idx)}
                        title="Remove Variant"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 4: Images */}
        <div className="admin-form-card">
          <div className="admin-form-section-header">
            <h2 className="admin-form-section-title">
              <span className="section-num">4</span>
              Product Images & Media
            </h2>
            <div className="admin-section-actions">
              <label className="admin-btn-add-row file-upload-trigger">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleBatchFilesSelect}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload Images</span>
              </label>

              <button
                type="button"
                className="admin-btn-add-row"
                onClick={handleAddImage}
              >
                + Add Asset
              </button>
            </div>
          </div>

          {images.length === 0 ? (
            <div className="admin-empty-table-state">
              <p>No images added yet. Click <strong>Upload Images</strong> to choose files from your PC or <strong>+ Add Asset</strong> to add a row.</p>
            </div>
          ) : (
            <table className="admin-dynamic-table">
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>Preview</th>
                  <th style={{ width: "50%" }}>Image Source</th>
                  <th style={{ width: "22%" }}>Image Type</th>
                  <th style={{ width: "12%" }}>Sort Order</th>
                  <th style={{ width: "8%" }}></th>
                </tr>
              </thead>
              <tbody>
                {images.map((img, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="admin-img-preview-box">
                        {img.previewUrl || img.image ? (
                          <img
                            src={img.previewUrl || resolveImageUrl(img.image)}
                            alt="preview"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="admin-image-source-cell">
                        {img.isUrlMode ? (
                          <div className="admin-image-url-box">
                            <input
                              type="text"
                              className="admin-dynamic-row-input"
                              placeholder="https://... or /media/..."
                              value={img.image || ""}
                              onChange={(e) => handleUpdateImage(idx, "image", e.target.value)}
                            />
                            <button
                              type="button"
                              className="admin-btn-toggle-mode"
                              onClick={() => handleUpdateImage(idx, "isUrlMode", false)}
                              title="Switch to file upload"
                            >
                              📁 File
                            </button>
                          </div>
                        ) : (
                          <div className="admin-file-picker-row">
                            <label className="admin-file-choose-label">
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleSingleFileSelect(idx, e.target.files[0]);
                                  }
                                }}
                              />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              <span>{img.file ? "Change File" : "Choose Image"}</span>
                            </label>

                            {img.file ? (
                              <div className="admin-selected-file-badge" title={img.file.name}>
                                <span className="file-name-txt">{img.file.name}</span>
                                <span className="file-size-txt">({(img.file.size / 1024).toFixed(0)} KB)</span>
                              </div>
                            ) : img.image ? (
                              <div className="admin-existing-file-badge" title={img.image}>
                                <span className="file-name-txt">{img.image.split("/").pop()}</span>
                                <span className="file-saved-tag">Saved</span>
                              </div>
                            ) : (
                              <span className="admin-no-file-txt">No file selected</span>
                            )}

                            <button
                              type="button"
                              className="admin-btn-toggle-mode"
                              onClick={() => handleUpdateImage(idx, "isUrlMode", true)}
                              title="Switch to paste URL"
                            >
                              🔗 URL
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        className="admin-dynamic-row-input"
                        value={img.image_type || "gallery"}
                        onChange={(e) => handleUpdateImage(idx, "image_type", e.target.value)}
                      >
                        <option value="front">Front / Primary</option>
                        <option value="gallery">Gallery</option>
                        <option value="side">Side Angle</option>
                        <option value="rear">Rear / I-O Ports</option>
                        <option value="internal">Internal / PCB</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="admin-dynamic-row-input"
                        value={img.sort_order ?? idx + 1}
                        onChange={(e) =>
                          handleUpdateImage(idx, "sort_order", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn-remove-row"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove Image"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 5: Specs */}
        <div className="admin-form-card">
          <div className="admin-form-section-header">
            <h2 className="admin-form-section-title">
              <span className="section-num">5</span>
              Technical Specifications
            </h2>
            <button
              type="button"
              className="admin-btn-add-row"
              onClick={handleAddSpec}
            >
              + Add Specification
            </button>
          </div>

          <table className="admin-dynamic-table">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Specification Name</th>
                <th style={{ width: "50%" }}>Specification Value</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>
            <tbody>
              {specifications.map((s, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      className="admin-dynamic-row-input"
                      value={s.specification_name || ""}
                      onChange={(e) =>
                        handleUpdateSpec(idx, "specification_name", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="admin-dynamic-row-input"
                      value={s.specification_value || ""}
                      onChange={(e) =>
                        handleUpdateSpec(idx, "specification_value", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-remove-row"
                      onClick={() => handleRemoveSpec(idx)}
                      title="Remove Spec"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sticky Actions */}
        <div className="admin-form-actions">
          <Link to="/admin/products" className="admin-btn-cancel">
            Cancel
          </Link>
          <button
            type="submit"
            className="admin-btn-save"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>UPDATING DATABASE...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>UPDATE PRODUCT SPECIFICATION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
