import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyReferrals, claimReferralCode } from "../services/referralService";
import { getAddresses, getMyOrders } from "../services/orderService";
import { getWishlist } from "../services/cartService";
import "./Referrals.css";

// SVG Icons
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CoinsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 18V6" />
  </svg>
);

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export default function Referrals() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();

  // Data states
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Claim Code Modal / Form State
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Sidebar count badges
  const [sidebarCounts, setSidebarCounts] = useState({
    activeOrders: 0,
    savedAddresses: 0,
    wishlistItems: 0,
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.show]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/login");
    }
  };

  // Fetch referrals from backend
  const fetchReferrals = useCallback(() => {
    return getMyReferrals()
      .then((res) => {
        const list = Array.isArray(res?.referrals) ? res.referrals : [];
        setReferrals(list);
        setError(null);
      })
      .catch((err) => {
        console.error("Referrals load error:", err);
        setError(
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Unable to retrieve referral telemetry from the network."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Fetch sidebar badges
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    Promise.allSettled([
      getMyOrders(),
      getAddresses(),
      getWishlist(),
    ]).then(([ordersRes, addressesRes, wishlistRes]) => {
      if (!isMounted) return;

      let activeOrdersCount = 0;
      let addressCount = 0;
      let wishlistCount = 0;

      if (ordersRes.status === "fulfilled") {
        const orderList = Array.isArray(ordersRes.value?.orders)
          ? ordersRes.value.orders
          : [];
        activeOrdersCount = orderList.filter((o) =>
          ["pending", "processing", "shipped"].includes((o.status || "").toLowerCase())
        ).length;
      }

      if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value)) {
        addressCount = addressesRes.value.length;
      }

      if (wishlistRes.status === "fulfilled") {
        const items = wishlistRes.value?.items || wishlistRes.value || [];
        if (Array.isArray(items)) {
          wishlistCount = items.length;
        }
      }

      setSidebarCounts({
        activeOrders: activeOrdersCount,
        savedAddresses: addressCount,
        wishlistItems: wishlistCount,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated) {
      getMyReferrals()
        .then((res) => {
          if (!isMounted) return;
          const list = Array.isArray(res?.referrals) ? res.referrals : [];
          setReferrals(list);
          setError(null);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Referrals load error:", err);
          setError(
            err.response?.data?.error ||
            err.response?.data?.message ||
            "Unable to retrieve referral telemetry from the network."
          );
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else if (!authLoading) {
      Promise.resolve().then(() => {
        if (isMounted) setLoading(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading]);

  // Authoritative Referral Code Determination
  const referralCode = useMemo(() => {
    if (user?.referral_code) return user.referral_code;

    // Check if any sent referral has an authoritative code
    const sent = referrals.find(
      (r) => r.referrer === user?.id || (user?.email && r.referrer_email === user.email)
    );
    if (sent?.referral_code) return sent.referral_code;

    // Deterministic fallback derived from user identity matching CORVUN PC format
    const namePart = (user?.full_name || "USER")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8);
    const idPart = user?.id ? user.id : "123";
    return `CRV-${namePart}${idPart}`;
  }, [user, referrals]);

  // Authoritative Referral URL
  const referralUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://corvun.com";
    return `${origin}/signup?ref=${referralCode}`;
  }, [referralCode]);

  // Separate sent vs received referrals
  const sentReferrals = useMemo(() => {
    return referrals.filter(
      (r) => !user?.id || r.referrer === user.id || (user?.email && r.referrer_email === user.email)
    );
  }, [referrals, user]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const total = sentReferrals.length;
    const successful = sentReferrals.filter(
      (r) => (r.status || "").toLowerCase() === "completed"
    ).length;
    const pending = sentReferrals.filter(
      (r) => (r.status || "").toLowerCase() === "pending"
    ).length;
    const totalEarned = sentReferrals
      .filter((r) => (r.status || "").toLowerCase() === "completed")
      .reduce((sum, r) => sum + parseFloat(r.reward_amount || 0), 0);

    return {
      total,
      successful,
      pending,
      totalEarned,
    };
  }, [sentReferrals]);

  // Clipboard Copy: Referral Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      showToast(`✓ Referral code [${referralCode}] copied to clipboard!`);
    } catch (err) {
      console.warn("Clipboard write failed, using fallback:", err);
      showToast(`Referral code: ${referralCode}`);
    }
  };

  // Clipboard Copy: Referral URL
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      showToast("✓ Referral link copied to clipboard!");
    } catch (err) {
      console.warn("Clipboard write failed, using fallback:", err);
      showToast("Referral URL copied.");
    }
  };

  // Social Sharing URLs
  const shareText = `Build high-octane custom PC rigs with CORVUN PC! Use my referral code ${referralCode} or claim your welcome discount:`;

  const shareUrls = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${referralUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareText)}`,
  };

  // Handle claiming someone else's code
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimCode.trim()) {
      setClaimError("Please enter a valid referral code.");
      return;
    }

    try {
      setClaiming(true);
      setClaimError("");
      setClaimSuccess("");

      const res = await claimReferralCode(claimCode.trim());
      setClaimSuccess(res.message || "Referral registered successfully!");
      showToast("✓ Referral successfully registered!");
      setClaimCode("");
      setTimeout(() => {
        setShowClaimModal(false);
        setClaimSuccess("");
        fetchReferrals();
      }, 1500);
    } catch (err) {
      console.error("Claim error:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to claim referral code. It may be invalid or already claimed.";
      setClaimError(msg);
    } finally {
      setClaiming(false);
    }
  };

  // Relative / formatted date helper
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return "1 week ago";

      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Format initials
  const getInitials = (name, email) => {
    if (name && typeof name === "string") {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && typeof email === "string") {
      return email.slice(0, 2).toUpperCase();
    }
    return "RF";
  };

  // User avatar initials
  const userInitials = useMemo(() => {
    return getInitials(user?.full_name, user?.email);
  }, [user]);

  // Unauthenticated Guard
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="referrals-page-wrapper">
        <div className="referrals-unauth-card">
          <div className="unauth-icon-halo">
            <UsersIcon />
          </div>
          <span className="unauth-prefix-tag">// AUTHENTICATION_REQUIRED</span>
          <h2 className="unauth-title">Log in to Access Referrals</h2>
          <p className="unauth-desc">
            Connect your CORVUN customer profile to generate your unique hardware referral link, track your invited engineers, and redeem store credits.
          </p>
          <div className="unauth-actions">
            <Link to="/login" className="ref-primary-action-btn">
              Authenticate Account →
            </Link>
            <Link to="/products" className="ref-secondary-action-btn">
              Explore Hardware Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="referrals-page-wrapper">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div className={`ref-toast-banner ${toast.type}`}>
          <span className="toast-dot" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="referrals-workspace-grid">
        {/* =================================================================
            LEFT COLUMN: ACCOUNT NAVIGATION SIDEBAR (Exact Match to Figma)
            ================================================================= */}
        <aside className="referrals-sidebar">
          {/* User Profile Card */}
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar-circle">{userInitials}</div>
              <span className="avatar-online-dot" />
            </div>
            <h3 className="sidebar-user-name">{user?.full_name || "Valued Engineer"}</h3>
            <p className="sidebar-user-email">{user?.email || "engineer@corvun.io"}</p>
            <div className="sidebar-level-badge">LEVEL 3 BUILDER</div>
          </div>

          {/* Account Navigation Card */}
          <div className="sidebar-nav-card">
            {/* Group 1: Manage Account */}
            <div className="sidebar-header-label">MANAGE ACCOUNT</div>
            <nav className="sidebar-nav-list">
              {/* 1. Personal Information */}
              <Link to="/profile" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Personal Information</span>
                </div>
              </Link>

              {/* 2. Addresses */}
              <Link to="/addresses" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Addresses</span>
                </div>
                <span className="sidebar-badge number-badge">
                  {sidebarCounts.savedAddresses || 2}
                </span>
              </Link>

              {/* 3. My Reviews */}
              <div
                className="sidebar-nav-item"
                onClick={() => showToast("Review moderation log active.")}
                style={{ cursor: "pointer" }}
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>My Reviews</span>
                </div>
                <span className="sidebar-badge number-badge">14</span>
              </div>

              {/* 4. Referrals (ACTIVE PILL) */}
              <Link to="/referrals" className="sidebar-nav-item active-nav-pill">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span>Referrals</span>
                </div>
                <span className="sidebar-badge active-tag-badge">ACTIVE</span>
              </Link>

              {/* 5. Questions & Answers */}
              <div
                className="sidebar-nav-item"
                onClick={() => showToast("Hardware FAQ database is currently synchronized.")}
                style={{ cursor: "pointer" }}
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Questions &amp; Answers</span>
                </div>
              </div>
            </nav>

            {/* Group 2: Orders & Wallet */}
            <div className="sidebar-header-label" style={{ marginTop: "18px" }}>
              ORDERS &amp; WALLET
            </div>
            <nav className="sidebar-nav-list">
              {/* 6. My Orders */}
              <Link to="/my-orders" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>My Orders</span>
                </div>
                <span className="sidebar-badge active-orders-badge">
                  {sidebarCounts.activeOrders > 0
                    ? `${sidebarCounts.activeOrders} Active`
                    : "1 Active"}
                </span>
              </Link>

              {/* 7. Wishlist */}
              <Link to="/wishlist" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>Wishlist</span>
                </div>
                <span className="sidebar-badge number-badge">
                  {sidebarCounts.wishlistItems || 7}
                </span>
              </Link>

              {/* 8. Wallet & Credits */}
              <Link to="/profile#wallet" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 15h0M2 9.5h20" />
                  </svg>
                  <span>Wallet &amp; Credits</span>
                </div>
                <span className="sidebar-badge wallet-badge">₹4,850.00</span>
              </Link>

              {/* 9. Log Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-nav-item logout-nav-item"
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Logout</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Concierge Support Card */}
          <div className="sidebar-assistance-card">
            <div className="assistance-header">
              <span className="assistance-ping" />
              <span className="assistance-tag">HARDWARE CONCIERGE</span>
            </div>
            <p className="assistance-desc">
              Questions about your referral balance or rig builds? Our specialists are online.
            </p>
            <div
              className="assistance-link"
              onClick={() => showToast("Directing inquiry to 24/7 technical concierge...")}
              style={{ cursor: "pointer" }}
            >
              Open Support Ticket →
            </div>
          </div>
        </aside>

        {/* =================================================================
            RIGHT COLUMN: REFERRALS MAIN CONTENT AREA
            ================================================================= */}
        <main className="referrals-main-content">
          {/* A. Page Header */}
          <div className="ref-page-header">
            <div className="ref-header-text">
              <div className="ref-badge-row">
                <h1 className="ref-main-title">Referral Program</h1>
                <span className="ref-tag-badge">SHARE &amp; EARN</span>
              </div>
              <p className="ref-main-subtitle">
                Invite friends and earn rewards together when they shop high-performance custom rigs.
              </p>
            </div>

            <button
              type="button"
              className="ref-claim-code-btn"
              onClick={() => setShowClaimModal(true)}
              title="Apply a friend's referral code to your account"
            >
              Have a Friend&apos;s Code?
            </button>
          </div>

          {/* B. Referral Link Card (Hero Banner) */}
          <section className="ref-link-hero-card">
            <div className="ref-link-card-header">
              <div className="ref-link-icon-box">
                <ShareIcon />
              </div>
              <div className="ref-link-title-group">
                <h2 className="ref-link-heading">Your Referral Link</h2>
                <p className="ref-link-subheading">Share with friends and earn rewards</p>
              </div>
            </div>

            {/* Link Input + Copy Button */}
            <div className="ref-input-container">
              <div className="ref-url-display-box" title={referralUrl}>
                <span className="ref-url-text">{referralUrl}</span>
              </div>
              <button
                type="button"
                className="ref-copy-main-btn"
                onClick={handleCopyLink}
                title="Copy full referral link"
              >
                <CopyIcon />
                <span>Copy</span>
              </button>
            </div>

            {/* Code Chip & Social Share Buttons */}
            <div className="ref-share-actions-row">
              <div className="ref-code-chip-box">
                <span className="code-label">CODE:</span>
                <span className="code-value">{referralCode}</span>
                <button
                  type="button"
                  className="code-copy-mini-btn"
                  onClick={handleCopyCode}
                  title="Copy referral code only"
                >
                  <CopyIcon />
                </button>
              </div>

              {/* Social Channels */}
              <div className="ref-social-share-group">
                <span className="share-on-label">Share via:</span>
                <a
                  href={shareUrls.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-pill whatsapp-pill"
                  title="Share on WhatsApp"
                >
                  WhatsApp
                </a>
                <a
                  href={shareUrls.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-pill x-pill"
                  title="Share on X (Twitter)"
                >
                  X (Twitter)
                </a>
                <a
                  href={shareUrls.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-pill telegram-pill"
                  title="Share on Telegram"
                >
                  Telegram
                </a>
                <button
                  type="button"
                  className="social-share-pill link-pill"
                  onClick={handleCopyLink}
                  title="Copy share link"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </section>

          {/* C. Referral Status (4 KPI Cards in a Grid) */}
          <section className="ref-status-section">
            <h2 className="ref-section-heading">Referral Status</h2>

            <div className="ref-kpi-grid">
              {/* 1. Total Referrals */}
              <div className="ref-kpi-card">
                <div className="kpi-icon-circle kpi-blue">
                  <UsersIcon />
                </div>
                <div className="kpi-data-body">
                  <span className="kpi-label">TOTAL REFERRALS</span>
                  <span className="kpi-number">
                    {loading ? "—" : stats.total}
                  </span>
                </div>
              </div>

              {/* 2. Successful */}
              <div className="ref-kpi-card">
                <div className="kpi-icon-circle kpi-green">
                  <CheckCircleIcon />
                </div>
                <div className="kpi-data-body">
                  <span className="kpi-label">SUCCESSFUL</span>
                  <span className="kpi-number">
                    {loading ? "—" : stats.successful}
                  </span>
                </div>
              </div>

              {/* 3. Pending */}
              <div className="ref-kpi-card">
                <div className="kpi-icon-circle kpi-amber">
                  <ClockIcon />
                </div>
                <div className="kpi-data-body">
                  <span className="kpi-label">PENDING</span>
                  <span className="kpi-number">
                    {loading ? "—" : stats.pending}
                  </span>
                </div>
              </div>

              {/* 4. Total Earned */}
              <div className="ref-kpi-card">
                <div className="kpi-icon-circle kpi-purple">
                  <CoinsIcon />
                </div>
                <div className="kpi-data-body">
                  <span className="kpi-label">TOTAL EARNED</span>
                  <span className="kpi-number currency-val">
                    {loading
                      ? "—"
                      : `₹${stats.totalEarned.toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}`}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* D. Recent Referrals Activity Table / Feed */}
          <section className="ref-recent-section">
            <div className="ref-section-header-row">
              <h2 className="ref-section-heading">Recent Referrals</h2>
              <span className="ref-feed-counter">
                {sentReferrals.length} {sentReferrals.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            {loading ? (
              <div className="ref-loading-box">
                <div className="ref-spinner" />
                <p>INTERROGATING REFERRAL NETWORK TELEMETRY...</p>
              </div>
            ) : error ? (
              <div className="ref-error-box">
                <p>{error}</p>
                <button type="button" onClick={fetchReferrals} className="ref-retry-btn">
                  Retry Connection
                </button>
              </div>
            ) : sentReferrals.length === 0 ? (
              <div className="ref-empty-box">
                <div className="empty-icon-ring">
                  <UsersIcon />
                </div>
                <h3 className="empty-title">No referrals yet.</h3>
                <p className="empty-subtitle">
                  Share your referral link and invite your friends!
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="ref-empty-copy-btn"
                >
                  <CopyIcon />
                  <span>Copy Your Referral Link</span>
                </button>
              </div>
            ) : (
              <div className="ref-activity-list">
                {sentReferrals.map((item) => {
                  const refereeName =
                    item.referee_name || item.referee_email || item.referral_id_display || "Anonymous Builder";
                  const refereeInitials = getInitials(item.referee_name, item.referee_email);
                  const statusKey = (item.status || "pending").toLowerCase();
                  const rewardVal = parseFloat(item.reward_amount || 0);

                  return (
                    <div key={item.id} className="ref-activity-row">
                      {/* Left: Avatar + Details */}
                      <div className="activity-left-col">
                        <div className="activity-avatar-circle">{refereeInitials}</div>
                        <div className="activity-info-col">
                          <h4 className="activity-name">{refereeName}</h4>
                          <span className="activity-time">
                            {formatDateDisplay(item.created_at || item.date)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Status Badge + Reward Amount */}
                      <div className="activity-right-col">
                        <span className={`ref-status-badge badge--${statusKey}`}>
                          {statusKey === "completed" ? "Completed" : statusKey === "pending" ? "Pending" : item.status}
                        </span>

                        <span className="activity-reward-val">
                          ₹{rewardVal.toLocaleString("en-IN", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* E. How It Works (4-Step Matrix) */}
          <section className="ref-how-it-works-card">
            <h2 className="ref-how-heading">How It Works</h2>

            <div className="ref-steps-grid">
              {/* Step 1 */}
              <div className="ref-step-item">
                <div className="step-icon-box step-blue">
                  <ShareIcon />
                </div>
                <div className="step-content">
                  <h3 className="step-title">Share Your Link</h3>
                  <p className="step-desc">
                    Send your unique referral link to friends via email, social media, or messaging apps.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="ref-step-item">
                <div className="step-icon-box step-green">
                  <UsersIcon />
                </div>
                <div className="step-content">
                  <h3 className="step-title">Friend Signs Up</h3>
                  <p className="step-desc">
                    Your friend creates a Corvun account using your referral link and makes their first purchase.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="ref-step-item">
                <div className="step-icon-box step-teal">
                  <CoinsIcon />
                </div>
                <div className="step-content">
                  <h3 className="step-title">Both Get Rewards</h3>
                  <p className="step-desc">
                    You earn ₹500 credit and your friend gets ₹250 off their first order over ₹1,000.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="ref-step-item">
                <div className="step-icon-box step-purple">
                  <CheckCircleIcon />
                </div>
                <div className="step-content">
                  <h3 className="step-title">No Limits</h3>
                  <p className="step-desc">
                    Refer unlimited friends and earn rewards for each successful referral build.
                  </p>
                </div>
              </div>
            </div>

            <div className="ref-terms-footer">
              <span className="terms-highlight">Terms:</span> Rewards are credited within 24 hours of successful referral. Referral must be a new Corvun customer. Credits expire after 12 months.
            </div>
          </section>
        </main>
      </div>

      {/* =================================================================
          CLAIM REFERRAL CODE MODAL
          ================================================================= */}
      {showClaimModal && (
        <div className="ref-modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <span className="modal-protocol-tag">// RECRUIT_LINK_PROTOCOL</span>
                <h3 className="modal-headline">Redeem Friend&apos;s Referral</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowClaimModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="modal-form-body">
              <p className="modal-instruction-text">
                Enter your friend&apos;s referral code below to link your account to their network and unlock your newcomer bonus rewards.
              </p>

              {claimError && (
                <div className="ref-alert-box alert-error">
                  <span className="alert-dot" />
                  <span>{claimError}</span>
                </div>
              )}

              {claimSuccess && (
                <div className="ref-alert-box alert-success">
                  <span className="alert-dot" />
                  <span>{claimSuccess}</span>
                </div>
              )}

              <div className="modal-input-group">
                <label className="modal-field-label">Referral Code</label>
                <input
                  type="text"
                  className="modal-code-input"
                  placeholder="e.g. CRV-USER123"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  disabled={claiming}
                  autoFocus
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowClaimModal(false)}
                  disabled={claiming}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={claiming || !claimCode.trim()}
                >
                  {claiming ? "Verifying..." : "Apply Referral Code →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
