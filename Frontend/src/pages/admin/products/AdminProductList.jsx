import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAdminProducts,
  deleteAdminProduct,
  getAdminBrands,
} from "../../../services/adminProductService";
import "./AdminProductList.css";

export default function AdminProductList() {
  const navigate = useNavigate();

  /* ── Data ───────────────────────────────────────────────────────────── */
  const [products,    setProducts]    = useState([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext,     setHasNext]     = useState(false);
  const [hasPrev,     setHasPrev]     = useState(false);
  const PAGE_SIZE = 10;

  /* ── Filters ────────────────────────────────────────────────────────── */
  const [search,         setSearch]         = useState("");
  const [selectedBrand,  setSelectedBrand]  = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy,         setSortBy]         = useState("newest");
  const [brands,         setBrands]         = useState([]);

  /* ── UI ─────────────────────────────────────────────────────────────── */
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  /* ── Load brands once ───────────────────────────────────────────────── */
  useEffect(() => {
    getAdminBrands()
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  /* ── Auto-dismiss toast ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  /* ── Fetch products ─────────────────────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: currentPage, page_size: PAGE_SIZE, sort: sortBy };
      if (search.trim())  params.search = search.trim();
      if (selectedBrand)  params.brand  = selectedBrand;
      if (selectedStatus) params.status = selectedStatus;

      const data    = await getAdminProducts(params);
      const results = data.results || (Array.isArray(data) ? data : []);
      setProducts(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
    } catch (err) {
      console.error("AdminProductList:", err);
      setError("Unable to load products. Verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedBrand, selectedStatus, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Helpers ────────────────────────────────────────────────────────── */
  const handleSearchChange = (e) => { setSearch(e.target.value); setCurrentPage(1); };
  const handleFilter = (setter) => (e) => { setter(e.target.value); setCurrentPage(1); };

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(currentPage * PAGE_SIZE, totalCount);

  /* ── Delete ─────────────────────────────────────────────────────────── */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAdminProduct(deleteTarget.id);
      setToastMessage(`"${deleteTarget.product_name}" removed from registry.`);
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting product.");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="apl-page">

      {/* Page Header */}
      <div className="apl-header">
        <div className="apl-header-left">
          <h1 className="apl-title">Hardware Products</h1>
          <p className="apl-subtitle">
            Manage inventory, base specifications, and SKU availability
          </p>
        </div>
        <Link to="/admin/products/add" className="apl-add-btn" id="add-product-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
          + Add Product
        </Link>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="apl-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{toastMessage}</span>
          <button className="apl-toast-close" onClick={() => setToastMessage("")}>✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="apl-filter-bar">
        <div className="apl-search-wrap">
          <svg className="apl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="product-search"
            type="text"
            className="apl-search-input"
            placeholder="Search by model or SKU..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select id="brand-filter" className="apl-select" value={selectedBrand} onChange={handleFilter(setSelectedBrand)}>
          <option value="">Brand: All</option>
          {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>

        <select id="status-filter" className="apl-select" value={selectedStatus} onChange={handleFilter(setSelectedStatus)}>
          <option value="">Status: All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select id="sort-filter" className="apl-select" value={sortBy} onChange={handleFilter(setSortBy)}>
          <option value="newest">Sort by: Newest</option>
          <option value="oldest">Sort by: Oldest</option>
          <option value="price_low">Sort by: Price ↑</option>
          <option value="price_high">Sort by: Price ↓</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="apl-card">
        {loading ? (
          <div className="apl-empty">
            <div className="apl-spinner"/>
            <span>Scanning hardware registry...</span>
          </div>

        ) : error ? (
          <div className="apl-empty apl-empty--error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button className="apl-retry-btn" onClick={fetchProducts}>↺ Retry Connection</button>
          </div>

        ) : products.length === 0 ? (
          <div className="apl-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8"  y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <div className="apl-empty-title">No Products Found</div>
            <div className="apl-empty-desc">
              {search || selectedBrand || selectedStatus
                ? "No products match your current filters. Try adjusting or clearing them."
                : "The product registry is empty. Add your first product to get started."}
            </div>
            {!search && !selectedBrand && !selectedStatus && (
              <Link to="/admin/products/add" className="apl-add-btn" style={{ marginTop: "8px" }}>
                + Add First Product
              </Link>
            )}
          </div>

        ) : (
          <>
            <div className="apl-table-wrap">
              <table className="apl-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th>Base Price</th>
                    <th>Total Stock</th>
                    <th>Variants</th>
                    <th>Status</th>
                    <th className="apl-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const stock         = Number(p.stock);
                    const threshold     = Number(p.low_stock_threshold ?? 5);
                    const isLowStock    = stock > 0 && stock <= threshold;
                    const isOutOfStock  = stock <= 0;
                    const variantCount  = p.variants?.length ?? 0;
                    const isActive      = (p.status || "active").toLowerCase() === "active";
                    // In Figma: red/coral dot for active items, grey dot for inactive
                    const dotColor = isActive ? "#ef3842" : "#64748b";

                    return (
                      <tr key={p.id}>

                        {/* ── Product Name ─────────────────────────────── */}
                        <td>
                          <div className="apl-prod-cell">
                            <span
                              className="apl-row-dot"
                              style={{ background: dotColor }}
                            />
                            <span className="apl-prod-name" title={p.product_name}>
                              {p.product_name}
                            </span>
                          </div>
                        </td>

                        {/* ── Brand ────────────────────────────────────── */}
                        <td>
                          <span className="apl-brand-text">
                            {p.brand_name || `Brand #${p.brand}`}
                          </span>
                        </td>

                        {/* ── Base Price ───────────────────────────────── */}
                        <td>
                          <span className="apl-price">
                            ₹{Number(p.base_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* ── Total Stock ──────────────────────────────── */}
                        <td>
                          <span
                            className="apl-stock-num"
                            style={{
                              color: stock === 0 ? "#ef4444" : "#ffffff"
                            }}
                          >
                            {stock}
                          </span>
                        </td>

                        {/* ── Variants ─────────────────────────────────── */}
                        <td>
                          <span className="apl-variant-count">{variantCount}</span>
                        </td>

                        {/* ── Status ───────────────────────────────────── */}
                        <td>
                          <span className={`apl-status ${isActive ? "apl-status--active" : "apl-status--inactive"}`}>
                            <span className="apl-status-dot"/>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* ── Actions ──────────────────────────────────── */}
                        <td>
                          <div className="apl-actions">
                            {/* Edit — matches Figma pencil icon */}
                            <Link
                              to={`/admin/products/edit/${p.id}`}
                              className="apl-icon-btn apl-icon-btn--edit"
                              title="Edit Product"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </Link>
                            {/* Delete — secondary action */}
                            <button
                              className="apl-icon-btn apl-icon-btn--delete"
                              title="Delete Product"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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

            {/* Pagination */}
            <div className="apl-pagination">
              <span className="apl-pagination-info">
                Showing {rangeStart}–{rangeEnd} of {totalCount} items
              </span>
              <div className="apl-pagination-controls">
                <button className="apl-page-btn" disabled={!hasPrev} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <span className="apl-page-current">{currentPage}</span>
                <button className="apl-page-btn" disabled={!hasNext} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="apl-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="apl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="apl-modal-header">
              <h2 className="apl-modal-title">Confirm Deletion</h2>
              <button className="apl-modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="apl-modal-body">
              <p className="apl-modal-text">
                Permanently delete this product and all associated variants, images, and specifications?
              </p>
              <div className="apl-modal-product-info">
                <div className="apl-modal-product-name">{deleteTarget.product_name}</div>
                <div className="apl-modal-product-sku">SKU: {deleteTarget.sku}</div>
              </div>
              <p className="apl-modal-warning">This action cannot be undone.</p>
            </div>
            <div className="apl-modal-footer">
              <button className="apl-modal-cancel" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="apl-modal-confirm" disabled={deleting} onClick={handleConfirmDelete}>
                {deleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
