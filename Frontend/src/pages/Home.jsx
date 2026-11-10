import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, getCategories, getBrands, getBanners } from "../services/productService";
import "./Home.css";

// SVG Hardware Icons & Badges
const ArrowRightIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const SlidersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "var(--corvun-red)" : "none"}
    stroke={filled ? "var(--corvun-red)" : "currentColor"}
    strokeWidth="2"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

// Approved hardware network brands (fallback if DB has 0 brands)
const DEFAULT_BRAND_NETWORK = [
  "AMD",
  "intel",
  "NVIDIA",
  "ASUS",
  "MSI",
  "GIGABYTE",
  "CORSAIR",
  "SAMSUNG",
];

function Home() {
  const navigate = useNavigate();

  // State
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [error, setError] = useState("");

  // Load General Data (Categories, Brands, Banners)
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        setLoadingGeneral(true);
        const [catData, brandData, bannerData] = await Promise.allSettled([
          getCategories(),
          getBrands(),
          getBanners(),
        ]);

        if (isMounted) {
          if (catData.status === "fulfilled") {
            setCategories(Array.isArray(catData.value) ? catData.value : catData.value.results || []);
          }
          if (brandData.status === "fulfilled") {
            setBrands(Array.isArray(brandData.value) ? brandData.value : brandData.value.results || []);
          }
          if (bannerData.status === "fulfilled") {
            setBanners(Array.isArray(bannerData.value) ? bannerData.value : bannerData.value.results || []);
          }
        }
      } catch (err) {
        console.error("Home initial data load error:", err);
      } finally {
        if (isMounted) setLoadingGeneral(false);
      }
    };

    fetchInitialData();
    return () => { isMounted = false; };
  }, []);

  // Load Featured Products based on active tab
  useEffect(() => {
    let isMounted = true;

    const fetchTabProducts = async () => {
      try {
        setLoadingProducts(true);
        setError("");

        let sortParam = "newest";
        if (activeTab === "deals") {
          sortParam = "price_low";
        } else if (activeTab === "trending" || activeTab === "best_sellers") {
          sortParam = "newest";
        } else if (activeTab === "new_arrivals") {
          sortParam = "newest";
        }

        const data = await getProducts({ page_size: 6, sort: sortParam });
        if (isMounted) {
          setFeaturedProducts(data.results || []);
        }
      } catch (err) {
        console.error("Home products load error:", err);
        if (isMounted) {
          setError("Failed to load hardware inventory from server.");
        }
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    fetchTabProducts();
    return () => { isMounted = false; };
  }, [activeTab]);

  const toggleWishlist = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddToCart = (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products/${productId}`);
  };

  const activeHeroBanner = banners.length > 0 ? banners[0] : null;

  return (
    <div className="corvun-home-page">
      {/* ==================================================
          1. HERO SECTION
          ================================================== */}
      <section className="home-hero-section">
        <div className="home-hero-container">
          {/* Left Column: Heading, Subtext, Actions, Benefits */}
          <div className="hero-left-column">
            <div className="hero-performance-badge">
              <span className="hero-badge-dot" />
              <span className="hero-badge-text">NEXT GEN PERFORMANCE</span>
            </div>

            <h1 className="hero-main-heading">
              BUILD BEYOND
              <span className="hero-highlight-red">LIMITS</span>
            </h1>

            <p className="hero-description-text">
              Premium PC components engineered for ruthless clock speeds, zero thermal throttling, and uncompromising power users.
            </p>

            <div className="hero-button-group">
              <Link to="/products" className="hero-btn-primary">
                <span>Shop Components</span>
                <ArrowRightIcon />
              </Link>

              <Link to="/pc-builder" className="hero-btn-secondary">
                <span>Build Your PC</span>
                <SlidersIcon />
              </Link>
            </div>

            {/* Bottom 3 Features Strip */}
            <div className="hero-feature-strip">
              <div className="feature-strip-item">
                <div className="feature-strip-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <div className="feature-strip-text">
                  <span className="feature-title">FREE SHIPPING</span>
                  <span className="feature-sub">Orders above ₹2,000</span>
                </div>
              </div>

              <div className="feature-strip-item">
                <div className="feature-strip-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <div className="feature-strip-text">
                  <span className="feature-title">100% GENUINE</span>
                  <span className="feature-sub">Direct brand seals</span>
                </div>
              </div>

              <div className="feature-strip-item">
                <div className="feature-strip-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </div>
                <div className="feature-strip-text">
                  <span className="feature-title">EASY RETURNS</span>
                  <span className="feature-sub">7-day zero-hassle</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Cabinet Frame */}
          <div className="hero-right-column">
            <div className="hero-showcase-card">
              <div className="showcase-top-badges">
                <span className="showcase-tag">RGB GEN-4</span>
                <span className="showcase-prime-pill">CORVUN PRIME</span>
              </div>

              {activeHeroBanner && activeHeroBanner.image ? (
                <div className="showcase-media-box">
                  <img
                    src={activeHeroBanner.image}
                    alt={activeHeroBanner.title || "Corvun Workstation"}
                    className="showcase-banner-img"
                  />
                </div>
              ) : (
                <div className="showcase-rig-render">
                  <div className="rig-ambient-glow" />
                  <div className="rig-chassis-shell">
                    <div className="chassis-glass-panel">
                      <div className="liquid-cooler-loop" />
                      <div className="gpu-illuminated-bracket" />
                      <div className="ram-rgb-stripes">
                        <span /><span /><span /><span />
                      </div>
                      <div className="chassis-front-fans">
                        <span className="fan-ring glow-red" />
                        <span className="fan-ring glow-red" />
                        <span className="fan-ring glow-red" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="showcase-bottom-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--corvun-red)" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <div className="aeroflow-text">
                  <span className="aero-title">AEROFLOW TECH</span>
                  <span className="aero-sub">Performance Your Way</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          2. CATALOGUE INDEX / SHOP BY CATEGORY
          ================================================== */}
      <section className="home-section categories-index-section">
        <div className="section-content-wrapper">
          <div className="section-heading-bar">
            <div className="heading-title-group">
              <span className="section-sub-label">CATALOGUE INDEX</span>
              <h2 className="section-main-title">SHOP BY CATEGORY</h2>
            </div>
            <Link to="/products" className="section-action-link">
              <span>View All</span>
              <ArrowRightIcon />
            </Link>
          </div>

          {loadingGeneral ? (
            <div className="section-loading-box">
              <div className="corvun-spinner" />
              <span>Querying Hardware Catalogue...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="corvun-empty-panel">
              <span className="empty-tech-tag">// CATALOGUE_INDEX_STANDBY</span>
              <p className="empty-message-text">
                No categories found in PostgreSQL database. Categories created by Administrator in Admin &gt; Categories will appear here.
              </p>
              <Link to="/products" className="empty-action-btn">
                Browse All Components →
              </Link>
            </div>
          ) : (
            <div className="category-cards-grid">
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="cat-box-card"
                >
                  <div className="cat-box-img-wrap">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="cat-real-img" />
                    ) : (
                      <div className="cat-fallback-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <rect x="9" y="9" width="6" height="6" />
                          <line x1="9" y1="1" x2="9" y2="4" />
                          <line x1="15" y1="1" x2="15" y2="4" />
                          <line x1="9" y1="20" x2="9" y2="23" />
                          <line x1="15" y1="20" x2="15" y2="23" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="cat-box-info">
                    <h3 className="cat-box-title">{cat.name}</h3>
                    <p className="cat-box-sub">{cat.description || "Component Distribution"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          3. BUILDER / AI PROMOTIONAL SECTION
          ================================================== */}
      <section className="home-section builder-promo-section">
        <div className="section-content-wrapper">
          <div className="builder-promo-two-col">
            {/* Left Promo Card: AI PC Assistant */}
            <div className="promo-card-ai">
              <div className="ai-card-inner">
                <div className="ai-card-content">
                  <div className="ai-title-row">
                    <h3 className="ai-heading">AI PC Assistant</h3>
                    <span className="ai-beta-badge">Beta</span>
                  </div>
                  <p className="ai-subtext">
                    Tell us your budget and needs. Our AI will suggest the best PC build for you.
                  </p>

                  <div className="ai-tags-row">
                    <span className="ai-tag-pill">Gaming</span>
                    <span className="ai-tag-pill">Video Editing</span>
                    <span className="ai-tag-pill">Office Work</span>
                    <span className="ai-tag-pill">Custom Use</span>
                  </div>

                  <Link to="/pc-builder" className="ai-try-btn">
                    <span>Try AI Assistant</span>
                    <ArrowRightIcon />
                  </Link>
                </div>

                <div className="ai-mascot-visual">
                  <div className="ai-bot-graphic">
                    <div className="ai-bot-head">
                      <span className="ai-bot-eye" />
                      <span className="ai-bot-eye" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Promo Card: Real-Time Validation */}
            <div className="promo-card-rules">
              <div className="rules-tag-row">
                <span className="rules-dot" />
                <span className="rules-meta">REAL-TIME VALIDATION</span>
              </div>

              <h3 className="rules-heading">
                YOUR BUILD. YOUR<br />RULES.
              </h3>

              <p className="rules-subtext">
                Zero bottleneck guarantee. Our dynamic hardware checker cross-references physical clearances, wattage overheads, and BIOS compatibility instantly.
              </p>

              <div className="rules-chips-row">
                <span className="rules-chip">⚙️ Wattage Checker</span>
                <span className="rules-chip-sep">•</span>
                <span className="rules-chip">🔲 Clearance Matrix</span>
              </div>

              <div className="rules-action-row">
                <Link to="/pc-builder" className="rules-start-btn">
                  <span>Start Building</span>
                  <SlidersIcon />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          4. FEATURED PRODUCTS (3 COLUMNS)
          ================================================== */}
      <section className="home-section featured-products-section">
        <div className="section-content-wrapper">
          <div className="section-heading-bar">
            <div className="heading-title-group">
              <span className="section-sub-label">RIG-GRADE INVENTORY</span>
              <h2 className="section-main-title">FEATURED PRODUCTS</h2>
            </div>

            {/* Filter Tabs */}
            <div className="featured-filter-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === "trending" ? "active" : ""}`}
                onClick={() => setActiveTab("trending")}
              >
                Trending
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "best_sellers" ? "active" : ""}`}
                onClick={() => setActiveTab("best_sellers")}
              >
                Best Sellers
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "new_arrivals" ? "active" : ""}`}
                onClick={() => setActiveTab("new_arrivals")}
              >
                New Arrivals
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "deals" ? "active" : ""}`}
                onClick={() => setActiveTab("deals")}
              >
                Deals
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="section-loading-box">
              <div className="corvun-spinner" />
              <span>Querying Rig-Grade Inventory...</span>
            </div>
          ) : error ? (
            <div className="corvun-error-panel">
              <span>{error}</span>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="corvun-empty-panel">
              <span className="empty-tech-tag">// REPOSITORY_STANDBY</span>
              <p className="empty-message-text">
                No products available in this category filter. Hardware added by Administrator in Admin &gt; Products will appear here dynamically.
              </p>
              <Link to="/products" className="empty-action-btn">
                View All Components →
              </Link>
            </div>
          ) : (
            <div className="featured-3col-grid">
              {featuredProducts.map((prod) => {
                const isWished = wishlistIds.has(prod.id);
                const formattedPrice = Number(prod.base_price || 0).toLocaleString("en-IN");
                const categoryLabel = prod.category_name ? prod.category_name.toUpperCase() : "HARDWARE";
                const brandLabel = prod.brand_name ? prod.brand_name.toUpperCase() : "CORVUN";

                return (
                  <div key={prod.id} className="reference-product-card">
                    {/* Top Wishlist Heart */}
                    <button
                      type="button"
                      className={`card-wishlist-trigger ${isWished ? "wished" : ""}`}
                      onClick={(e) => toggleWishlist(prod.id, e)}
                      aria-label="Add to wishlist"
                    >
                      <HeartIcon filled={isWished} />
                    </button>

                    {/* Image Box */}
                    <Link to={`/products/${prod.id}`} className="card-media-anchor">
                      <div className="card-media-wrap">
                        {prod.primary_image ? (
                          <img
                            src={prod.primary_image}
                            alt={prod.product_name}
                            className="card-actual-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="card-default-graphic">
                            <span className="graphic-chip-id">{brandLabel}</span>
                            <span className="graphic-center-logo">CORVUN_CORE</span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Meta & Title */}
                    <div className="card-info-body">
                      <div className="card-breadcrumb-tag">
                        <span>{categoryLabel}</span>
                        <span>/</span>
                        <span>{brandLabel}</span>
                      </div>

                      <h3 className="card-product-heading" title={prod.product_name}>
                        <Link to={`/products/${prod.id}`}>
                          {prod.product_name}
                        </Link>
                      </h3>

                      {/* Rating Line */}
                      <div className="card-rating-line">
                        <span className="rating-star">★</span>
                        <span className="rating-value">4.8</span>
                        <span className="rating-count">(120 reviews)</span>
                      </div>

                      {/* Price & Cart Action */}
                      <div className="card-bottom-action-row">
                        <div className="card-price-group">
                          <span className="price-gst-sub">INR Incl. GST</span>
                          <span className="price-bold-val">₹{formattedPrice}</span>
                        </div>

                        <button
                          type="button"
                          className="card-quick-cart-btn"
                          onClick={(e) => handleAddToCart(prod.id, e)}
                          title="View & Add to Cart"
                        >
                          <CartIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          5. BEST DEALS + PRE-BUILT PCS
          ================================================== */}
      <section className="home-section deals-prebuilt-section">
        <div className="section-content-wrapper">
          <div className="deals-prebuilt-grid">
            {/* Left Card: Best Deals */}
            <div className="deals-banner-card">
              <div className="deals-card-header">
                <span className="deals-pill-badge">UP TO 30% OFF</span>
                <h3 className="deals-banner-title">
                  BEST DEALS FOR<br />REAL BUILDERS
                </h3>
                <p className="deals-banner-sub">
                  Massive price cuts on selected high-end RTX 4080s, AMD Gen5 SSDs, and titanium PSUs.
                </p>
              </div>

              <div className="deals-visual-display">
                <div className="deals-glow-mesh" />
                <div className="deals-stack-chassis" />
              </div>

              <div className="deals-card-footer">
                <Link to="/products?sort=price_low" className="deals-cta-link">
                  <span>Shop Deals</span>
                  <ArrowRightIcon />
                </Link>
                <span className="deals-timestamp">UPDATED HOURLY</span>
              </div>
            </div>

            {/* Right Card: Pre-Built PCs */}
            <div className="prebuilt-banner-card">
              <div className="prebuilt-card-header">
                <span className="prebuilt-pill-badge">PLUG & PLAY TIER</span>
                <h3 className="prebuilt-banner-title">
                  PRE-BUILT PCS
                </h3>
                <p className="prebuilt-banner-sub">
                  Ready to game, create, and work. No hassle. Fully stress-tested under 24-hour synthetic thermal loads.
                </p>
              </div>

              <div className="prebuilt-visual-display">
                <div className="pc-lineup-row">
                  <div className="pc-tower-thumb">P1</div>
                  <div className="pc-tower-thumb">P2</div>
                  <div className="pc-tower-thumb highlight">P3</div>
                  <div className="pc-tower-thumb">P4</div>
                  <div className="pc-tower-thumb">P5</div>
                </div>
              </div>

              <div className="prebuilt-card-footer">
                <Link to="/pc-builder" className="prebuilt-cta-link">
                  <span>Explore Pre-Built PCs</span>
                  <ArrowRightIcon />
                </Link>
                <span className="prebuilt-onsite-tag">3-YR ONSITE CARE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          6. OFFICIAL HARDWARE NETWORK / BRANDS
          ================================================== */}
      <section className="home-section hardware-network-section">
        <div className="section-content-wrapper text-center">
          <span className="section-sub-label">AUTHORIZED DIRECT PARTNERS</span>
          <h2 className="section-main-title network-title">OFFICIAL HARDWARE NETWORK</h2>

          <div className="brands-pill-row">
            {brands.length > 0 ? (
              brands.map((b) => (
                <Link
                  key={b.id}
                  to={`/products?brand=${encodeURIComponent(b.name)}`}
                  className="brand-network-pill"
                >
                  {b.name}
                </Link>
              ))
            ) : (
              DEFAULT_BRAND_NETWORK.map((bName) => (
                <Link
                  key={bName}
                  to={`/products?brand=${encodeURIComponent(bName)}`}
                  className="brand-network-pill"
                >
                  {bName}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          7. WHY CHOOSE CORVUN (5 CARDS)
          ================================================== */}
      <section className="home-section why-choose-section">
        <div className="section-content-wrapper text-center">
          <span className="section-sub-label">STANDARD OF EXCELLENCE</span>
          <h2 className="section-main-title choose-title">WHY CHOOSE CORVUN</h2>

          <div className="why-corvun-5col-grid">
            {/* Card 1: QUALITY ASSURED */}
            <div className="choose-metric-card">
              <div className="choose-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <h3 className="choose-card-title">QUALITY ASSURED</h3>
              <p className="choose-card-text">
                100% Genuine factory-sealed retail hardware with full Indian warranty validation.
              </p>
            </div>

            {/* Card 2: WIDE SELECTION */}
            <div className="choose-metric-card">
              <div className="choose-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3 className="choose-card-title">WIDE SELECTION</h3>
              <p className="choose-card-text">
                Over 2,500 active SKUs from all premier global chipmakers and case fabricators.
              </p>
            </div>

            {/* Card 3: EXPERT SUPPORT */}
            <div className="choose-metric-card">
              <div className="choose-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
              </div>
              <h3 className="choose-card-title">EXPERT SUPPORT</h3>
              <p className="choose-card-text">
                24/7 direct access to dedicated PC hardware architects via Discord & WhatsApp.
              </p>
            </div>

            {/* Card 4: SECURE PAYMENTS */}
            <div className="choose-metric-card">
              <div className="choose-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="choose-card-title">SECURE PAYMENTS</h3>
              <p className="choose-card-text">
                Instant UPI, major cards, and zero-cost EMI plans with end-to-end encryption.
              </p>
            </div>

            {/* Card 5: FAST DELIVERY */}
            <div className="choose-metric-card">
              <div className="choose-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="choose-card-title">FAST DELIVERY</h3>
              <p className="choose-card-text">
                Shock-proof reinforced logistics across 19,000+ pin codes in India.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
