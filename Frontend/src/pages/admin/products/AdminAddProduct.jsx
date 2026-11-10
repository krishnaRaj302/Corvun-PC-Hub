import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAdminProduct,
  createAdminVariant,
  createAdminImage,
  createAdminSpecification,
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

export default function AdminAddProduct() {
  const navigate = useNavigate();

  // Categories & Brands for dropdown selects
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // Core Product Form
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

  // Dynamic Lists
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([
    {
      image: "",
      file: null,
      previewUrl: "",
      image_type: "front",
      sort_order: 1,
      isUrlMode: false,
    },
  ]);
  const [specifications, setSpecifications] = useState([
    { specification_name: "", specification_value: "" },
  ]);

  // Form State
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Categories & Brands on Mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setMetaLoading(true);
        const [cats, brs] = await Promise.all([
          getAdminCategories(),
          getAdminBrands(),
        ]);
        setCategories(cats || []);
        setBrands(brs || []);

        // Pre-select first category and brand if available
        if (cats && cats.length > 0) {
          setFormData((prev) => ({ ...prev, category: cats[0].id }));
        }
        if (brs && brs.length > 0) {
          setFormData((prev) => ({ ...prev, brand: brs[0].id }));
        }
      } catch (err) {
        console.error("Failed to load categories/brands:", err);
        setGlobalError("Unable to fetch category and brand options from server.");
      } finally {
        setMetaLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Form Field Change Handler
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // ------------------------------------
  // Dynamic Variants Handlers
  // ------------------------------------
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

  // ------------------------------------
  // Dynamic Images Handlers
  // ------------------------------------
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
        image: "",
        isUrlMode: false,
      };
      return copy;
    });
  };

  const handleBatchFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => {
      const base = prev.filter(
        (img) => img.file || (img.image && img.image.trim())
      );
      const newItems = files.map((file, i) => ({
        image: "",
        file,
        previewUrl: URL.createObjectURL(file),
        image_type: base.length === 0 && i === 0 ? "front" : "gallery",
        sort_order: base.length + i + 1,
        isUrlMode: false,
      }));
      return [...base, ...newItems];
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

  // ------------------------------------
  // Dynamic Specifications Handlers
  // ------------------------------------
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

  // ------------------------------------
  // Form Validation
  // ------------------------------------
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

  // ------------------------------------
  // Submit: Create Product + Child Records
  // ------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Create Base Product
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

      const res = await createAdminProduct(productPayload);
      const createdProduct = res.data;
      const productId = createdProduct.id;

      // 2. Create Variants (if any entered with name)
      const validVariants = variants.filter((v) => v.variant_name.trim());
      for (const v of validVariants) {
        await createAdminVariant({
          product: productId,
          variant_name: v.variant_name.trim(),
          price: v.price ? parseFloat(v.price).toFixed(2) : null,
          stock: parseInt(v.stock, 10) || 0,
        });
      }

      // 3. Create Images (if any entered with file or valid URL)
      const validImages = images.filter(
        (img) => img.file || (img.image && img.image.trim())
      );
      for (const img of validImages) {
        if (img.file) {
          const imgData = new FormData();
          imgData.append("product", productId);
          imgData.append("image", img.file);
          imgData.append("image_type", img.image_type || "gallery");
          imgData.append("sort_order", parseInt(img.sort_order, 10) || 0);
          await createAdminImage(imgData);
        } else {
          await createAdminImage({
            product: productId,
            image: img.image.trim(),
            image_type: img.image_type || "gallery",
            sort_order: parseInt(img.sort_order, 10) || 0,
          });
        }
      }

      // 4. Create Specifications (if any entered with name & value)
      const validSpecs = specifications.filter(
        (s) => s.specification_name.trim() && s.specification_value.trim()
      );
      for (const s of validSpecs) {
        await createAdminSpecification({
          product: productId,
          specification_name: s.specification_name.trim(),
          specification_value: s.specification_value.trim(),
        });
      }

      // 5. Navigate to Product List with success
      navigate("/admin/products", {
        replace: true,
        state: { message: `Product "${createdProduct.product_name}" added successfully.` },
      });
    } catch (err) {
      console.error("Failed to create product:", err);
      let errMsg = "An error occurred while creating the product.";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errMsg = err.response.data;
        } else if (err.response.data.error) {
          errMsg = err.response.data.error;
        } else {
          // Flatten field error dict
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

  return (
    <div className="admin-form-page">
      {/* Header */}
      <div className="admin-form-header">
        <div className="admin-form-header-left">
          <div className="admin-breadcrumb">
            <Link to="/admin/products">Products</Link>
            <span>/</span>
            <span>Add New Hardware</span>
          </div>
          <h1 className="admin-form-title">Create New Product</h1>
          <p className="admin-form-desc">
            Define hardware specification, initial inventory units, pricing, variants, and gallery assets.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
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
        {/* Section 1: Product Information */}
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
                placeholder="e.g. NVIDIA GeForce RTX 4090 OC 24GB"
                value={formData.product_name}
                onChange={(e) => handleFieldChange("product_name", e.target.value)}
              />
              {errors.product_name && (
                <span className="admin-field-error">{errors.product_name}</span>
              )}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">
                SKU (Stock Keeping Unit) <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`admin-field-input ${errors.sku ? "has-error" : ""}`}
                placeholder="e.g. GPU-NV-4090-OC"
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
                disabled={metaLoading}
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
                disabled={metaLoading}
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
              placeholder="Enter technical overview, architecture notes, performance tier..."
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
            />
          </div>
        </div>

        {/* Section 2: Pricing & Inventory */}
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
                placeholder="e.g. 179999.00"
                value={formData.base_price}
                onChange={(e) => handleFieldChange("base_price", e.target.value)}
              />
              {errors.base_price && (
                <span className="admin-field-error">{errors.base_price}</span>
              )}
            </div>

            <div className="admin-field-group">
              <label className="admin-label">
                Initial Stock Units <span className="required-star">*</span>
              </label>
              <input
                type="number"
                min="0"
                className={`admin-field-input ${errors.stock ? "has-error" : ""}`}
                placeholder="e.g. 20"
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
                placeholder="e.g. 5"
                value={formData.low_stock_threshold}
                onChange={(e) => handleFieldChange("low_stock_threshold", e.target.value)}
              />
              {errors.low_stock_threshold && (
                <span className="admin-field-error">{errors.low_stock_threshold}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Product Variants */}
        <div className="admin-form-card">
          <div className="admin-form-section-header">
            <h2 className="admin-form-section-title">
              <span className="section-num">3</span>
              Product Variants (Optional)
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
              No variants defined. The product will be sold in its single base configuration.
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
                        placeholder="e.g. 32GB White Edition"
                        value={v.variant_name}
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
                        placeholder="Variant price (leave empty for base)"
                        value={v.price}
                        onChange={(e) => handleUpdateVariant(idx, "price", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="admin-dynamic-row-input"
                        placeholder="0"
                        value={v.stock}
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

        {/* Section 5: Specifications */}
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
                      placeholder="e.g. Memory Interface, Socket, TDP"
                      value={s.specification_name}
                      onChange={(e) =>
                        handleUpdateSpec(idx, "specification_name", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="admin-dynamic-row-input"
                      placeholder="e.g. 384-bit GDDR6X, AM5, 450W"
                      value={s.specification_value}
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

        {/* Sticky Actions Bar */}
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
                <span>SAVING TO POSTGRESQL...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>SAVE PRODUCT SPECIFICATION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
