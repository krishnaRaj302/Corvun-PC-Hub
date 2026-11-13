import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getProducts, getCategories, getBrands } from "../services/productService";
import { resolveImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./Products.css";

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const currentSearch = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Cart interaction states
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCartItem } = useCart();
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState(null);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleAddToCart = async (product) => {
    if (product.stock === 0) {
      setFeedback({
        type: "error",
        message: `${product.product_name} is depleted from stock.`,
      });
      return;
    }

    if (!isAuthenticated) {
      setFeedback({
        type: "warning",
        message: "Please authenticate to deploy components to your workstation cart.",
      });
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    setActionLoading((prev) => ({ ...prev, [product.id]: true }));

    try {
      const res = await addToCartItem({
        productId: product.id,
        quantity: 1,
      });

      setFeedback({
        type: "success",
        message: res?.message || `✓ Added ${product.product_name} to your workstation cart!`,
      });
    } catch (err) {
      console.error("Add to cart error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to deploy component to cart.";
      setFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // Sync search input when URL changes
  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) setSearchInput(currentSearch);
    });
    return () => {
      isMounted = false;
    };
  }, [currentSearch]);

  // Load Categories and Brands once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catData, brandData] = await Promise.all([
          getCategories(),
          getBrands(),
        ]);
        setCategories(catData || []);
        setBrands(brandData || []);
      } catch (err) {
        console.error("Metadata load error:", err);
      }
    };

    fetchMetadata();
  }, []);

  // Fetch Products whenever filters, search, sort, or page changes
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          page: currentPage,
          page_size: 12,
          sort: currentSort,
        };

        if (currentSearch) params.search = currentSearch;
        if (currentCategory) params.category = currentCategory;
        if (currentBrand) params.brand = currentBrand;

        const data = await getProducts(params);

        setProducts(data.results || []);
        setTotalCount(data.count || 0);
        setHasNext(Boolean(data.next));
        setHasPrev(Boolean(data.previous));
      } catch (err) {
        console.error("Products load error:", err);
        setError("Failed to retrieve hardware records from repository node.");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [currentSearch, currentCategory, currentBrand, currentSort, currentPage]);

  // Update query params helper
  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Always reset to page 1 when changing search or filter
    if (key !== "page") {
      newParams.set("page", "1");
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQueryParam("search", searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const totalPages = Math.ceil(totalCount / 12) || 1;

  return (
    <div className="products-catalog-page">
      {/* Action Notification Toast */}
      {feedback && (
        <div className={`catalog-toast-alert alert-${feedback.type}`}>
          <span className="toast-dot" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Telemetry Header */}
      <div className="catalog-top-banner">
        <div className="catalog-banner-inner">
          <div className="catalog-header-text">
            <span className="catalog-node-code">// COMPONENT REPOSITORY // ACTIVE MATRIX</span>
            <h1 className="catalog-main-title">Hardware Catalog</h1>
            <p className="catalog-subtitle">
              High-performance computing components, graphics processors, enterprise NVMe storage, and liquid cooling units.
            </p>
          </div>

          <div className="catalog-live-count">
            <span className="count-num">{totalCount}</span>
            <span className="count-label">RECORDS INDEXED</span>
          </div>
        </div>
      </div>

      <div className="catalog-layout-container">
        {/* Mobile Filter Toggle */}
        <div className="mobile-filter-bar">
          <button
            type="button"
            className="mobile-filter-toggle-btn"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>{mobileFilterOpen ? "HIDE FILTERS" : "FILTER HARDWARE"}</span>
          </button>

          <span className="mobile-results-count">{totalCount} items found</span>
        </div>

        {/* Sidebar Filters */}
        <aside className={`catalog-sidebar ${mobileFilterOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title">TELEMETRY FILTERS</h3>
            {(currentCategory || currentBrand || currentSearch) && (
              <button
                type="button"
                className="sidebar-reset-btn"
                onClick={handleClearFilters}
              >
                Reset All
              </button>
            )}
          </div>

          {/* Search inside sidebar for mobile */}
          <form className="sidebar-search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search components..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          {/* Category Filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">Hardware Clusters</h4>
            <div className="filter-list">
              <button
                type="button"
                className={`filter-item-btn ${!currentCategory ? "active" : ""}`}
                onClick={() => updateQueryParam("category", "")}
              >
                <span>All Categories</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-item-btn ${currentCategory === cat.name ? "active" : ""}`}
                  onClick={() => updateQueryParam("category", cat.name)}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">Hardware Vendors</h4>
            <div className="filter-list">
              <button
                type="button"
                className={`filter-item-btn ${!currentBrand ? "active" : ""}`}
                onClick={() => updateQueryParam("brand", "")}
              >
                <span>All Vendors</span>
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`filter-item-btn ${currentBrand === b.name ? "active" : ""}`}
                  onClick={() => updateQueryParam("brand", b.name)}
                >
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Products Grid Section */}
        <div className="catalog-results-panel">
          {/* Controls Bar: Active Filters & Sorting */}
          <div className="catalog-controls-bar">
            <div className="active-filters-tags">
              {currentSearch && (
                <span className="filter-pill">
                  Search: <strong>"{currentSearch}"</strong>
                  <button onClick={() => updateQueryParam("search", "")}>✕</button>
                </span>
              )}
              {currentCategory && (
                <span className="filter-pill">
                  Category: <strong>{currentCategory}</strong>
                  <button onClick={() => updateQueryParam("category", "")}>✕</button>
                </span>
              )}
              {currentBrand && (
                <span className="filter-pill">
                  Brand: <strong>{currentBrand}</strong>
                  <button onClick={() => updateQueryParam("brand", "")}>✕</button>
                </span>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="sort-control-wrapper">
              <label htmlFor="sort-select">SORT BY:</label>
              <select
                id="sort-select"
                className="catalog-sort-select"
                value={currentSort}
                onChange={(e) => updateQueryParam("sort", e.target.value)}
              >
                <option value="newest">Newest Arrivals</option>
                <option value="oldest">Oldest Additions</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Content States */}
          {loading ? (
            <div className="catalog-status-box">
              <div className="corvun-spinner" />
              <span>INTERROGATING COMPONENT DATABASE...</span>
            </div>
          ) : error ? (
            <div className="catalog-status-box error-box">
              <span className="error-icon">!</span>
              <p>{error}</p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => updateQueryParam("page", String(currentPage))}
              >
                Retry Telemetry Fetch
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="catalog-status-box empty-box">
              <span className="empty-code">// REPOSITORY_STANDBY</span>
              <h3>No products available.</h3>
              <p>
                {currentSearch || currentCategory || currentBrand
                  ? "No hardware components match your active search or filter criteria."
                  : "No products available in the catalog. Hardware inventory will automatically appear here once added by the Administrator."}
              </p>
              {(currentSearch || currentCategory || currentBrand) && (
                <button
                  type="button"
                  className="clear-filters-btn"
                  onClick={handleClearFilters}
                >
                  Clear All Filters & Reset
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div className="catalog-grid">
                {products.map((prod) => {
                  const isLowStock = prod.stock <= prod.low_stock_threshold;
                  const isOutOfStock = prod.stock === 0;

                  return (
                    <Link
                      key={prod.id}
                      to={`/products/${prod.id}`}
                      className="catalog-product-card"
                      style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}
                    >
                      <div className="card-reticle-corner-tl" />
                      <div className="card-reticle-corner-br" />

                      {/* Header Badge Row */}
                      <div className="card-badge-header">
                        <span className="prod-brand-tag">{prod.brand_name || "CORVUN"}</span>
                        {isOutOfStock ? (
                          <span className="status-badge depleted">DEPLETED</span>
                        ) : isLowStock ? (
                          <span className="status-badge low-stock">LOW STOCK ({prod.stock})</span>
                        ) : (
                          <span className="status-badge in-stock">IN STOCK</span>
                        )}
                      </div>

                      {/* Image Area */}
                      <div className="prod-img-box">
                        {prod.primary_image ? (
                          <img
                            src={resolveImageUrl(prod.primary_image)}
                            alt={prod.product_name}
                            className="prod-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="prod-img-placeholder">
                            <span>CORVUN_HW</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="prod-meta-box">
                        <span className="prod-category-tag">{prod.category_name}</span>
                        <h2 className="prod-name-title" title={prod.product_name}>
                          {prod.product_name}
                        </h2>
                        <p className="prod-desc-text">{prod.description}</p>

                        <div className="prod-footer-box">
                          <div className="prod-price-box">
                            <span className="price-title">UNIT BASE</span>
                            <span className="price-val">
                              ₹{parseFloat(prod.base_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <span className="sku-badge">SKU: {prod.sku}</span>
                        </div>

                        <button
                          type="button"
                          className={`prod-add-cart-btn ${isOutOfStock ? "disabled" : ""}`}
                          disabled={isOutOfStock || Boolean(actionLoading[prod.id])}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddToCart(prod);
                          }}
                        >
                          {actionLoading[prod.id] ? (
                            <span className="btn-spinner" />
                          ) : isOutOfStock ? (
                            "DEPLETED"
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                              ADD TO RIG
                            </>
                          )}
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="catalog-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={!hasPrev || currentPage <= 1}
                    onClick={() => updateQueryParam("page", String(currentPage - 1))}
                  >
                    ← Previous
                  </button>

                  <div className="pagination-pages-list">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`page-num-btn ${pageNum === currentPage ? "active" : ""}`}
                        onClick={() => updateQueryParam("page", String(pageNum))}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={!hasNext || currentPage >= totalPages}
                    onClick={() => updateQueryParam("page", String(currentPage + 1))}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Products;
