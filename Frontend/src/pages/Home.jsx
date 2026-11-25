import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, getCategories, getBrands } from "../services/productService";
import { resolveImageUrl } from "../utils/imageUrl";
import HeroCabinetStage, { HeroParticlesCanvas } from "../components/HeroCabinetStage";
import aiRobotVideo from "../assets/images/Robot_projecting_holographic_gam…_3fa0d295_1080p.mp4";
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

const AI_WORKLOAD_TAGS = [
  "Gaming",
  "Video Editing",
  "Office Work",
  "Custom Use",
];

const PREBUILT_TIERS = [
  { id: "P1", label: "ENTRY ESPORTS", spec: "RTX 4060 // RYZEN 5", temp: "52°C" },
  { id: "P2", label: "1440P PRO RIG", spec: "RTX 4070S // i5-14600K", temp: "54°C" },
  { id: "P3", label: "FLAGSHIP ULTRA", spec: "RTX 4080S // RYZEN 9", temp: "49°C" },
  { id: "P4", label: "CREATOR 4K", spec: "RTX 4090 // i9-14900K", temp: "51°C" },
  { id: "P5", label: "APEX LIQUID", spec: "DUAL LOOP // 64GB DDR5", temp: "44°C" },
];

const VALIDATION_MODULES = [
  { id: "wattage", label: "⚙️ Wattage Checker", status: "850W RAIL // +24% HEADROOM OK" },
  { id: "clearance", label: "🔲 Clearance Matrix", status: "GPU 342MM // 360MM RAD FIT OK" },
  { id: "bios", label: "🧬 BIOS Sync", status: "PCIe 5.0 // DDR5 EXPO VERIFIED" },
];

function Home() {
  const navigate = useNavigate();

  // State
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [selectedWorkload, setSelectedWorkload] = useState("Gaming");
  const [activeRigTier, setActiveRigTier] = useState("P3");
  const [activeValidationMod, setActiveValidationMod] = useState("wattage");
  const [heroTheme, setHeroTheme] = useState("rgb");
  const [heroTurbo, setHeroTurbo] = useState(false);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [failedBrandLogos, setFailedBrandLogos] = useState(new Set());
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [error, setError] = useState("");

  // Load General Data (Categories, Brands, Banners)
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        setLoadingGeneral(true);
        const [catData, brandData] = await Promise.allSettled([
          getCategories(),
          getBrands({ status: "listed" }),
        ]);

        if (isMounted) {
          if (catData.status === "fulfilled") {
            setCategories(Array.isArray(catData.value) ? catData.value : catData.value.results || []);
          }
          if (brandData.status === "fulfilled") {
            setBrands(Array.isArray(brandData.value) ? brandData.value : brandData.value.results || []);
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

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setHeroTilt({ x: x * -12, y: y * -8 });
  };

  const handleHeroMouseLeave = () => {
    setHeroTilt({ x: 0, y: 0 });
  };

  return (
    <div className="corvun-home-page">
      {/* ==================================================
          1. HERO SECTION (FULL-BLEED CINEMATIC RIG & PARTICLES)
          ================================================== */}
      <section
        className={`home-hero-section hero-theme-${heroTheme} ${heroTurbo ? "hero--turbo" : ""}`}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* Full-Bleed Animated 3D Hardware Backdrop */}
        <div
          className="hero-cinematic-backdrop"
          style={{
            transform: `translate3d(${heroTilt.x}px, ${heroTilt.y}px, 0) scale(1.02)`,
          }}
          aria-hidden="true"
        >
          <img
            src="/images/hero-cinematic-rig.png"
            alt=""
            className="hero-cinematic-img hero-cinematic-img-base"
          />
          <img
            src="/images/hero-cinematic-rig-rgb.png"
            alt=""
            className="hero-cinematic-img hero-cinematic-img-rgb"
          />
        </div>

        {/* Seamless Left-to-Right & Edge Vignette Obsidian Scrim */}
        <div className="hero-cinematic-scrim" aria-hidden="true" />

        {/* Live 60fps Rising Embers & Energy Streaks Canvas */}
        <HeroParticlesCanvas theme={heroTheme} isTurbo={heroTurbo} />

        {/* Subtle Volumetric Atmospheric Glow & Horizon Sweep */}
        <div className="hero-ambient-grid" aria-hidden="true" />
        <div className="hero-ambient-radial" aria-hidden="true" />
        <div className="hero-cyber-scanline" aria-hidden="true" />

        <div className="home-hero-container">
          {/* Left Column: Heading, Subtext, Actions, Benefits */}
          <div className="hero-left-column">
            <div className="hero-performance-badge">
              <span className="hero-badge-dot" />
              <span className="hero-badge-text">NEXT GEN PERFORMANCE // SYSTEM ONLINE</span>
              <span className="hero-badge-ver">v4.8</span>
            </div>

            <h1 className="hero-main-heading">
              <span className="hero-heading-line1">BUILD BEYOND</span>
              <span className="hero-highlight-red">LIMITS</span>
            </h1>

            <p className="hero-description-text">
              Precision PC components engineered for ruthless clock speeds, sub-ambient liquid cooling, and uncompromising power users.
            </p>

            {/* Live Hardware Telemetry Chips */}
            <div className="hero-telemetry-chips">
              <div className="telemetry-chip">
                <span className="chip-label">OVERCLOCK</span>
                <span className="chip-val">{heroTurbo ? "+24% TURBO" : "+18% PEAK"}</span>
              </div>
              <div className="telemetry-chip">
                <span className="chip-label">THERMAL MATRIX</span>
                <span className="chip-val">ZERO-THROTTLE</span>
              </div>
              <div className="telemetry-chip">
                <span className="chip-label">FRAME GEN</span>
                <span className="chip-val">DLSS 3.5 &amp; FSR 3</span>
              </div>
            </div>

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

          {/* Right Column: Floating Telemetry Overlay Over Full-Bleed Animated Rig */}
          <div className="hero-right-column">
            <HeroCabinetStage
              activeTheme={heroTheme}
              setActiveTheme={setHeroTheme}
              isTurbo={heroTurbo}
              setIsTurbo={setHeroTurbo}
            />
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
            {/* Left Promo Card: AI PC Assistant Full-Bleed Video Banner */}
            <div className="promo-card-ai">
              {/* Full-Bleed Background Video */}
              <video
                className="ai-bg-video"
                src={aiRobotVideo}
                poster="/images/corvun-ai-robot.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
              />

              {/* Smooth Dark Obsidian Gradient Scrim */}
              <div className="ai-video-scrim" aria-hidden="true" />

              {/* Top-Right Glassmorphic Status Badge */}
              <div className="ai-status-badge-top-right">
                <span className="ai-status-blip" />
                <span>CORVUN AI // ONLINE</span>
              </div>

              {/* Left-Side Overlaid Content & Controls */}
              <div className="ai-card-overlay-content">
                <div className="ai-title-row">
                  <h3 className="ai-heading">AI PC Assistant</h3>
                  <span className="ai-beta-badge">Beta</span>
                </div>
                <p className="ai-subtext">
                  Tell us your budget and needs. Our AI will suggest the best PC build for you.
                </p>

                <div className="ai-tags-row" role="group" aria-label="Select PC workload">
                  {AI_WORKLOAD_TAGS.map((tag) => {
                    const isActive = selectedWorkload === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setSelectedWorkload((prev) => (prev === tag ? null : tag))
                        }
                        className={`ai-tag-pill ${isActive ? "ai-tag-pill--active" : ""}`}
                        aria-pressed={isActive}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <Link
                  to={
                    selectedWorkload
                      ? `/pc-builder?workload=${encodeURIComponent(selectedWorkload)}`
                      : "/pc-builder"
                  }
                  className="ai-try-btn"
                >
                  <span>Try AI Assistant</span>
                  <ArrowRightIcon />
                </Link>
              </div>
            </div>

            {/* Right Promo Card: Real-Time Validation Full-Bleed Matrix Banner */}
            <div className="promo-card-rules">
              {/* Full-Bleed Animated 3D Hardware CAD Visual */}
              <img
                src="/images/rules-validation-banner.jpg"
                alt="3D ATX motherboard, GPU, and liquid cooling clearance validation blueprint"
                className="rules-bg-img"
              />
              <div className="rules-banner-scrim" aria-hidden="true" />
              <div className="rules-laser-scan" aria-hidden="true" />
              <div className="rules-card-sheen" aria-hidden="true" />

              {/* Top-Right Glassmorphic Status Badge */}
              <div className="rules-status-badge-top-right">
                <span className="rules-status-blip" />
                <span>MATRIX // VERIFIED</span>
              </div>

              <div className="rules-overlay-content">
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

                <div className="rules-chips-row" role="group" aria-label="Validation modules">
                  {VALIDATION_MODULES.map((mod) => {
                    const isActive = activeValidationMod === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onMouseEnter={() => setActiveValidationMod(mod.id)}
                        onClick={() => setActiveValidationMod(mod.id)}
                        className={`rules-chip ${isActive ? "rules-chip--active" : ""}`}
                        aria-pressed={isActive}
                      >
                        {mod.label}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const activeMod =
                    VALIDATION_MODULES.find((m) => m.id === activeValidationMod) ||
                    VALIDATION_MODULES[0];
                  return (
                    <div className="rules-live-telemetry">
                      <span className="rules-live-dot" />
                      <span>{activeMod.status}</span>
                    </div>
                  );
                })()}

                <div className="rules-action-row">
                  <Link to="/pc-builder" className="rules-start-btn">
                    <span>Start Building</span>
                    <SlidersIcon />
                  </Link>
                </div>
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

                      {/* Rating Line (Only if reviews exist) */}
                      {prod.reviews_count > 0 || prod.rating ? (
                        <div className="card-rating-line">
                          <span className="rating-star">★</span>
                          <span className="rating-value">{prod.rating || prod.average_rating || "5.0"}</span>
                          <span className="rating-count">({prod.reviews_count} {prod.reviews_count === 1 ? "review" : "reviews"})</span>
                        </div>
                      ) : (
                        <div className="card-rating-line">
                          <span className="rating-count" style={{ opacity: 0.65 }}>No reviews yet</span>
                        </div>
                      )}

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
              <img
                src="/images/deals-hardware-banner.jpg"
                alt="RTX GPU, Gen5 NVMe SSD, and Titanium PSU deals showcase"
                className="promo-banner-bg-img deals-bg-motion"
              />
              <div className="promo-banner-scrim" aria-hidden="true" />
              <div className="promo-banner-sheen" aria-hidden="true" />

              <div className="deals-card-header">
                <span className="deals-pill-badge">UP TO 30% OFF</span>
                <h3 className="deals-banner-title">
                  BEST DEALS FOR<br />REAL BUILDERS
                </h3>
                <p className="deals-banner-sub">
                  Massive price cuts on selected high-end RTX 4080s, AMD Gen5 SSDs, and titanium PSUs.
                </p>

                <div className="deals-inline-chips">
                  <span className="deal-mini-pill deal-mini-hot">RTX 4080 · -28%</span>
                  <span className="deal-mini-pill">GEN5 NVME · -30%</span>
                  <span className="deal-mini-pill">1000W PSU · -22%</span>
                </div>
              </div>

              <div className="deals-card-footer">
                <Link to="/products?sort=price_low" className="deals-cta-link">
                  <span>Shop Deals</span>
                  <ArrowRightIcon />
                </Link>
                <span className="deals-timestamp">
                  <span className="deals-live-dot" />
                  <span>UPDATED HOURLY</span>
                </span>
              </div>
            </div>

            {/* Right Card: Pre-Built PCs */}
            <div className="prebuilt-banner-card">
              <img
                src="/images/prebuilt-rigs-banner.jpg"
                alt="CORVUN custom liquid-cooled pre-built gaming PCs lineup"
                className="promo-banner-bg-img prebuilt-bg-motion"
              />
              <div className="promo-banner-scrim" aria-hidden="true" />
              <div className="promo-banner-sheen" aria-hidden="true" />

              <div className="prebuilt-card-header">
                <span className="prebuilt-pill-badge">PLUG & PLAY TIER</span>
                <h3 className="prebuilt-banner-title">
                  PRE-BUILT PCS
                </h3>
                <p className="prebuilt-banner-sub">
                  Ready to game, create, and work. No hassle. Fully stress-tested under 24-hour synthetic thermal loads.
                </p>

                <div className="prebuilt-overlay-controls">
                  <div className="pc-tier-pill-row" role="group" aria-label="Select pre-built rig tier">
                    {PREBUILT_TIERS.map((tier) => {
                      const isActive = activeRigTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onMouseEnter={() => setActiveRigTier(tier.id)}
                          onClick={() => setActiveRigTier(tier.id)}
                          className={`pc-tier-btn ${isActive ? "active" : ""}`}
                          aria-pressed={isActive}
                        >
                          {tier.id}
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const currentTier =
                      PREBUILT_TIERS.find((t) => t.id === activeRigTier) || PREBUILT_TIERS[2];
                    return (
                      <div className="pc-tier-telemetry-bar">
                        <span className="tier-telemetry-left">
                          <span className="tier-pulse-dot" />
                          <span>
                            {currentTier.id} // {currentTier.spec}
                          </span>
                        </span>
                        <span className="tier-telemetry-right">
                          <span className="thermal-wave" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                            <i />
                          </span>
                          <span>{currentTier.temp} LOAD</span>
                        </span>
                      </div>
                    );
                  })()}
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
          <span className="section-sub-label network-eyebrow">AUTHORIZED DIRECT PARTNERS</span>
          <h2 className="section-main-title network-title">OFFICIAL HARDWARE NETWORK</h2>

          {(() => {
            const safeBrands = Array.isArray(brands) ? brands : [];
            const listedBrands = safeBrands.filter(
              (b) => b && String(b.status || "").toLowerCase() === "listed"
            );

            const handleLogoError = (brandId) => {
              setFailedBrandLogos((prev) => {
                if (prev.has(brandId)) return prev;
                const next = new Set(prev);
                next.add(brandId);
                return next;
              });
            };

            const renderBrandCard = (b, keySuffix = "") => {
              const brandName = String(b.name || "Partner");
              const rawLogo = b.logo || b.image || "";
              const logoUrl = resolveImageUrl(rawLogo);
              const showImage = Boolean(logoUrl) && !failedBrandLogos.has(b.id);
              const count = Number(b.product_count ?? b.productCount ?? 0);
              const telemetryText =
                count > 0
                  ? `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"}`
                  : "VERIFIED";

              return (
                <Link
                  key={`${b.id}${keySuffix}`}
                  to={`/products?brand=${encodeURIComponent(brandName)}`}
                  className="partner-brand-card"
                  aria-label={`Shop ${brandName} components`}
                >
                  <span className="partner-card-sheen" aria-hidden="true" />

                  <div className="partner-logo-viewport">
                    {showImage ? (
                      <img
                        src={logoUrl}
                        alt={`${brandName} logo`}
                        className="partner-logo-img"
                        loading="lazy"
                        onError={() => handleLogoError(b.id)}
                      />
                    ) : (
                      <div className="partner-logo-fallback" aria-hidden="true">
                        <span className="fallback-monogram">
                          {brandName.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="partner-card-meta">
                    <span className="partner-brand-name">{brandName}</span>
                    <span
                      className={`partner-telemetry-pill ${count > 0 ? "telemetry-active" : "telemetry-verified"
                        }`}
                    >
                      <span className="telemetry-dot-mini" />
                      <span>{telemetryText}</span>
                    </span>
                  </div>
                </Link>
              );
            };

            if (loadingGeneral) {
              return (
                <div className="brands-partner-grid" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="partner-brand-card partner-card-skeleton">
                      <div className="partner-logo-viewport skeleton-shimmer" />
                      <div className="partner-card-meta">
                        <span className="skeleton-line-title skeleton-shimmer" />
                        <span className="skeleton-line-pill skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            if (listedBrands.length === 0) {
              return (
                <div className="corvun-empty-panel">
                  <span className="empty-tech-tag">// HARDWARE_NETWORK_STANDBY</span>
                  <p className="empty-message-text">
                    No active hardware partners listed at this time.
                  </p>
                </div>
              );
            }

            if (listedBrands.length > 6) {
              return (
                <div className="brands-marquee-viewport brands-spotlight-group">
                  <div className="brands-marquee-track">
                    {listedBrands.map((b) => renderBrandCard(b, "-a"))}
                    {listedBrands.map((b) => renderBrandCard(b, "-b"))}
                  </div>
                </div>
              );
            }

            return (
              <div className="brands-partner-grid brands-spotlight-group">
                {listedBrands.map((b) => renderBrandCard(b))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ==================================================
          7. WHY CHOOSE CORVUN (5 CARDS)
          ================================================== */}
      <section className="home-section why-choose-section">
        <div className="why-choose-ambient-glow" aria-hidden="true" />
        <div className="section-content-wrapper text-center">
          <span className="section-sub-label">STANDARD OF EXCELLENCE</span>
          <h2 className="section-main-title choose-title">WHY CHOOSE CORVUN</h2>
          <div className="choose-title-divider" aria-hidden="true" />

          <div className="why-corvun-5col-grid why-spotlight-group">
            {/* Card 1: QUALITY ASSURED */}
            <div className="choose-metric-card choose-card-1">
              <span className="choose-top-bar" aria-hidden="true" />
              <span className="choose-card-sheen" aria-hidden="true" />
              <div className="choose-card-head">
                <div className="choose-icon-box">
                  <span className="choose-icon-pulse" aria-hidden="true" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <span className="choose-metric-code">01 // 100%</span>
              </div>
              <h3 className="choose-card-title">QUALITY ASSURED</h3>
              <p className="choose-card-text">
                100% Genuine factory-sealed retail hardware with full Indian warranty validation.
              </p>
              <div className="choose-card-foot">
                <span className="choose-foot-dot" />
                <span>SEALED RETAIL</span>
              </div>
            </div>

            {/* Card 2: WIDE SELECTION */}
            <div className="choose-metric-card choose-card-2">
              <span className="choose-top-bar" aria-hidden="true" />
              <span className="choose-card-sheen" aria-hidden="true" />
              <div className="choose-card-head">
                <div className="choose-icon-box">
                  <span className="choose-icon-pulse" aria-hidden="true" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <span className="choose-metric-code">02 // 2,500+</span>
              </div>
              <h3 className="choose-card-title">WIDE SELECTION</h3>
              <p className="choose-card-text">
                Over 2,500 active SKUs from all premier global chipmakers and case fabricators.
              </p>
              <div className="choose-card-foot">
                <span className="choose-foot-dot" />
                <span>GLOBAL TIER-1</span>
              </div>
            </div>

            {/* Card 3: EXPERT SUPPORT */}
            <div className="choose-metric-card choose-card-3">
              <span className="choose-top-bar" aria-hidden="true" />
              <span className="choose-card-sheen" aria-hidden="true" />
              <div className="choose-card-head">
                <div className="choose-icon-box">
                  <span className="choose-icon-pulse" aria-hidden="true" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
                <span className="choose-metric-code">03 // 24/7</span>
              </div>
              <h3 className="choose-card-title">EXPERT SUPPORT</h3>
              <p className="choose-card-text">
                24/7 direct access to dedicated PC hardware architects via Discord & WhatsApp.
              </p>
              <div className="choose-card-foot">
                <span className="choose-foot-dot" />
                <span>ARCHITECT DESK</span>
              </div>
            </div>

            {/* Card 4: SECURE PAYMENTS */}
            <div className="choose-metric-card choose-card-4">
              <span className="choose-top-bar" aria-hidden="true" />
              <span className="choose-card-sheen" aria-hidden="true" />
              <div className="choose-card-head">
                <div className="choose-icon-box">
                  <span className="choose-icon-pulse" aria-hidden="true" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="choose-metric-code">04 // 256-BIT</span>
              </div>
              <h3 className="choose-card-title">SECURE PAYMENTS</h3>
              <p className="choose-card-text">
                Instant UPI, major cards, and zero-cost EMI plans with end-to-end encryption.
              </p>
              <div className="choose-card-foot">
                <span className="choose-foot-dot" />
                <span>ZERO-COST EMI</span>
              </div>
            </div>

            {/* Card 5: FAST DELIVERY */}
            <div className="choose-metric-card choose-card-5">
              <span className="choose-top-bar" aria-hidden="true" />
              <span className="choose-card-sheen" aria-hidden="true" />
              <div className="choose-card-head">
                <div className="choose-icon-box">
                  <span className="choose-icon-pulse" aria-hidden="true" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <span className="choose-metric-code">05 // 19K+</span>
              </div>
              <h3 className="choose-card-title">FAST DELIVERY</h3>
              <p className="choose-card-text">
                Shock-proof reinforced logistics across 19,000+ pin codes in India.
              </p>
              <div className="choose-card-foot">
                <span className="choose-foot-dot" />
                <span>ARMOR LOGISTICS</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
