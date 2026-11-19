import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getActiveDeals } from "../services/dealService";
import "./Deals.css";

// SVG Icons
const LightningBoltIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="var(--corvun-red)" stroke="var(--corvun-red)" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const FastDispatchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SpeedometerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M4.93 19.07l1.41-1.41M12 22v-2M19.07 19.07l-1.41-1.41M22 12h-2M19.07 4.93l-1.41 1.41" />
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="12" x2="16" y2="8" stroke="var(--corvun-red)" strokeWidth="2" />
  </svg>
);

const ThermometerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    <circle cx="11.5" cy="17.5" r="2" fill="var(--corvun-red)" />
  </svg>
);

const ChipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="15" x2="23" y2="15" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="15" x2="4" y2="15" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export default function Deals() {
  const navigate = useNavigate();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // VIP Drop Subscription state
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState(null);

  // Real-time Countdown Timer (Hours : Minutes : Seconds)
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 32,
    seconds: 42,
  });

  // Calculate live countdown to next cycle
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Target end of day (or fixed 24h cadence)
      const target = new Date();
      target.setHours(23, 59, 59, 999);

      const diff = target.getTime() - now.getTime();
      if (diff > 0) {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active promotions
  useEffect(() => {
    let isMounted = true;
    getActiveDeals().then((data) => {
      if (isMounted) {
        setDeals(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle promo code copy
  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setToastMessage({
          type: "success",
          text: `Promo code "${code}" copied to clipboard! Ready to apply at checkout.`,
        });
        setTimeout(() => setCopiedCode(null), 3000);
      });
    }
  };

  // Handle Deal Action Click
  const handleDealAction = (deal) => {
    // Automatically copy promo code
    if (deal.code && navigator.clipboard) {
      navigator.clipboard.writeText(deal.code).catch(() => {});
    }

    setToastMessage({
      type: "success",
      text: `Code "${deal.code}" activated! Redirecting to allocated inventory...`,
    });

    setTimeout(() => {
      navigate(deal.targetRoute || "/products");
    }, 600);
  };

  // Handle VIP Newsletter Subscription
  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!subscribeEmail || !subscribeEmail.includes("@")) {
      setToastMessage({
        type: "error",
        text: "Please provide a valid operator email address.",
      });
      return;
    }

    setSubscribeStatus("Subscribing...");
    setTimeout(() => {
      setSubscribeStatus("registered");
      setSubscribeEmail("");
      setToastMessage({
        type: "success",
        text: "Operator node registered. You will receive real-time priority telemetry on flash hardware drops.",
      });
    }, 800);
  };

  return (
    <div className="deals-page-wrapper">
      {/* Dynamic Toast Feedback */}
      {toastMessage && (
        <div className={`deals-floating-toast ${toastMessage.type}`} role="alert">
          <div className="toast-indicator" />
          <span className="toast-text">{toastMessage.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================
          1. TOP HERO SECTION (Matches Screenshot Exactly)
          ============================================================ */}
      <section className="deals-hero-section">
        <div className="deals-hero-content">
          {/* Centered Glowing Lightning Icon */}
          <div className="deals-hero-icon-frame">
            <LightningBoltIcon />
          </div>

          {/* Red Subtitle Protocol Tag */}
          <span className="deals-hero-protocol-tag">
            • PRIORITY ALLOCATION PROTOCOL • VERIFIED OFFERS
          </span>

          {/* Main Title */}
          <h1 className="deals-hero-title">Exclusive Deals &amp; Offers</h1>

          {/* Subtitle Description */}
          <p className="deals-hero-subtitle">
            Save big on enthusiast PC hardware, flagship GPUs, and custom liquid cooling
            kits. Limited-time offers you don't want to miss.
          </p>

          {/* 3 Trust Badges in Pill Frames */}
          <div className="deals-trust-badges-row">
            <div className="trust-pill-badge">
              <ShieldCheckIcon />
              <span>TIER-1 DISTRIBUTOR DIRECT</span>
            </div>

            <div className="trust-pill-badge">
              <FastDispatchIcon />
              <span>ZERO-LATENCY PRIORITY DISPATCH</span>
            </div>

            <div className="trust-pill-badge">
              <ShieldCheckIcon />
              <span>3-YEAR DIRECT COMPONENT RMA</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. ACTIVE DEALS GRID & LIVE COUNTDOWN
          ============================================================ */}
      <section className="deals-active-section">
        <div className="deals-container">
          {/* Section Header Row */}
          <div className="deals-section-header">
            <div className="deals-header-left">
              <div className="deals-title-bar-row">
                <span className="deals-vertical-bar" />
                <h2 className="deals-section-title">Active Deals</h2>
              </div>
              <span className="deals-node-sync-text">
                NODE SYNC: REGIONAL INVENTORY RESERVES VALIDATED
              </span>
            </div>

            {/* Real-time Ticking Countdown Clock */}
            <div className="deals-countdown-box">
              <ClockIcon />
              <span className="countdown-label">Deals refresh in:</span>
              <span className="countdown-timer">
                {String(timeLeft.hours).padStart(2, "0")}h :{" "}
                {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
                {String(timeLeft.seconds).padStart(2, "0")}s
              </span>
            </div>
          </div>

          {/* Deals Grid (6 Cards) */}
          <div className="deals-grid">
            {deals.map((deal) => {
              const isCopied = copiedCode === deal.code;

              return (
                <article key={deal.id} className="deal-card">
                  {/* Card Media Header */}
                  <div className="deal-media-frame">
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="deal-image"
                      loading="lazy"
                    />

                    {/* Top-Left Floating Tag (Featured / Hot Bundle) */}
                    {deal.badge && (
                      <span className={`deal-status-tag ${deal.badge === "HOT BUNDLE" ? "hot-bundle" : "featured"}`}>
                        {deal.badge}
                      </span>
                    )}

                    {/* Top-Right Floating Discount Tag */}
                    <span className="deal-discount-badge">{deal.discount}</span>
                  </div>

                  {/* Card Body */}
                  <div className="deal-body">
                    <h3 className="deal-title">{deal.title}</h3>
                    <p className="deal-description">{deal.description}</p>

                    {/* Expiration Tag */}
                    <div className="deal-expiry-row">
                      <ClockIcon />
                      <span className="deal-expiry-text">
                        Expires in: {deal.expiresInDays} days
                      </span>
                    </div>

                    {/* Card Footer / Action Row */}
                    <div className="deal-footer-row">
                      {/* Left: Promo Code Chip */}
                      <div
                        className="deal-promo-chip"
                        onClick={(e) => handleCopyCode(deal.code, e)}
                        title="Click to copy promo code"
                      >
                        <span className="promo-label">USE CODE</span>
                        <div className="promo-code-box">
                          <code className="promo-code-text">{deal.code}</code>
                          <CopyIcon />
                          {isCopied && <span className="copied-pill">COPIED</span>}
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <button
                        type="button"
                        className="deal-action-btn"
                        onClick={() => handleDealAction(deal)}
                      >
                        <span>{deal.buttonText || "Shop Now"}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          3. TELEMETRY METRIC STRIP (Matches Screenshot)
          ============================================================ */}
      <section className="deals-telemetry-strip-section">
        <div className="deals-container">
          <div className="telemetry-strip-card">
            {/* Metric 1 */}
            <div className="telemetry-metric-item">
              <div className="metric-icon-frame">
                <SpeedometerIcon />
              </div>
              <div className="metric-content">
                <span className="metric-headline">AVG. 4.8 GHz</span>
                <span className="metric-subtext">RIG TESTING CERTIFIED</span>
              </div>
            </div>

            <div className="telemetry-divider" />

            {/* Metric 2 */}
            <div className="telemetry-metric-item">
              <div className="metric-icon-frame red-accent">
                <ThermometerIcon />
              </div>
              <div className="metric-content">
                <span className="metric-headline">&lt; 62°C UNDER LOAD</span>
                <span className="metric-subtext">THERMAL HEADROOM VAL</span>
              </div>
            </div>

            <div className="telemetry-divider" />

            {/* Metric 3 */}
            <div className="telemetry-metric-item">
              <div className="metric-icon-frame">
                <ChipIcon />
              </div>
              <div className="metric-content">
                <span className="metric-headline">DDR5 6000MHz</span>
                <span className="metric-subtext">LOW LATENCY TUNED</span>
              </div>
            </div>

            <div className="telemetry-divider" />

            {/* Metric 4 */}
            <div className="telemetry-metric-item">
              <div className="metric-icon-frame">
                <ShieldCheckIcon />
              </div>
              <div className="metric-content">
                <span className="metric-headline">ZERO DEAD PIXEL</span>
                <span className="metric-subtext">100% BURN-IN TESTED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          4. VIP HARDWARE DROP NEWSLETTER SECTION (Bottom CTA)
          ============================================================ */}
      <section className="deals-newsletter-section">
        <div className="deals-container">
          <div className="deals-newsletter-box">
            <span className="newsletter-protocol-badge">
              • NODE TELEMETRY NOTIFICATIONS
            </span>
            <h2 className="newsletter-title">Never Miss a Hardware Drop</h2>
            <p className="newsletter-subtitle">
              Subscribe to our VIP builder alerts and be the first to know about flash sales,
              restocks, and exclusive promo codes.
            </p>

            <form className="deals-subscribe-form" onSubmit={handleSubscribe}>
              <div className="subscribe-input-wrapper">
                <input
                  type="email"
                  className="subscribe-input"
                  placeholder="Enter your operator email..."
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  disabled={subscribeStatus === "registered"}
                  required
                />
              </div>
              <button
                type="submit"
                className="subscribe-btn"
                disabled={subscribeStatus === "registered"}
              >
                <span>{subscribeStatus === "registered" ? "Subscribed" : "Subscribe to Alerts"}</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
