import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWishlist } from "../services/cartService";
import { getAddresses, getMyOrders } from "../services/orderService";
import "./CustomerProfile.css";

function CustomerProfile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Metrics for navigation badges
  const [counts, setCounts] = useState({
    activeOrders: 1,
    savedAddresses: 2,
    wishlistItems: 7,
  });

  // Profile fields state
  const [profileData, setProfileData] = useState(() => {
    const saved = localStorage.getItem("corvun_custom_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved profile:", e);
      }
    }
    return {
      fullName: user?.full_name || "Vikramaditya Rao",
      email: user?.email || "vikram.rao@corvun.io",
      phone: "+91 98840 54321",
      dob: "1994-11-14",
      gender: "Male",
      membershipTier: "Prime Member",
    };
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ ...profileData });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync user changes from AuthContext and load metrics
  useEffect(() => {
    let isMounted = true;

    // Fetch live counts and synchronize profile data safely
    Promise.allSettled([
      getMyOrders(),
      getAddresses(),
      getWishlist(),
    ]).then(([ordersRes, addressesRes, wishlistRes]) => {
      if (!isMounted) return;

      if (user?.full_name || user?.email) {
        setProfileData((prev) => ({
          ...prev,
          fullName: user.full_name || prev.fullName,
          email: user.email || prev.email,
        }));
      }

      let activeOrdersCount = 1;
      let addressCount = 2;
      let wishlistCount = 7;

      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        const active = ordersRes.value.filter(
          (o) =>
            o.status?.toLowerCase() === "pending" ||
            o.status?.toLowerCase() === "processing" ||
            o.status?.toLowerCase() === "shipped"
        ).length;
        if (active > 0) activeOrdersCount = active;
      }

      if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value)) {
        if (addressesRes.value.length > 0) {
          addressCount = addressesRes.value.length;
        }
      }

      if (wishlistRes.status === "fulfilled") {
        const items = wishlistRes.value?.items || wishlistRes.value || [];
        if (Array.isArray(items) && items.length > 0) {
          wishlistCount = items.length;
        }
      }

      setCounts({
        activeOrders: activeOrdersCount,
        savedAddresses: addressCount,
        wishlistItems: wishlistCount,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

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

  // Open Edit Modal
  const handleOpenEdit = () => {
    setEditFormData({
      fullName: profileData.fullName,
      email: profileData.email,
      phone: profileData.phone,
      dob: profileData.dob,
      gender: profileData.gender,
      membershipTier: profileData.membershipTier,
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Form
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      setProfileData({ ...editFormData });
      localStorage.setItem("corvun_custom_profile", JSON.stringify(editFormData));

      if (user && setUser) {
        setUser({
          ...user,
          full_name: editFormData.fullName,
        });
      }

      setIsSaving(false);
      setIsEditModalOpen(false);
      showToast("Personal credentials synchronized with workstation profile.");
    }, 400);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Format Date for display (e.g. "14 November 1994")
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "14 November 1994";
    try {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="profile-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="profile-toast-banner" role="alert">
          <span className="toast-dot" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Page Header */}
      <div className="profile-header-container">
        <nav className="profile-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-link">My Account</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Personal Info</span>
        </nav>

        <div className="profile-title-row">
          <div>
            <h1 className="profile-headline">Personal Information</h1>
            <p className="profile-subtitle">
              Manage your personal identity, contact details, and account security credentials.
            </p>
          </div>

          <Link to="/my-orders" className="profile-recent-orders-btn">
            <svg
              className="recent-orders-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>View Recent Orders</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Workstation Layout */}
      <div className="profile-workspace-grid">
        {/* Left Column: Account Navigation Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-sidebar-card">
            <div className="sidebar-header-label">ACCOUNT NAVIGATION</div>

            <nav className="sidebar-nav-list">
              {/* 1. Personal Info (Active) */}
              <Link to="/profile" className="sidebar-nav-item active-nav-pill">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Personal Info</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>

              {/* 2. My Orders */}
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
                  {counts.activeOrders} Active
                </span>
              </Link>

              {/* 3. Saved Addresses */}
              <Link to="/addresses" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Saved Addresses</span>
                </div>
                <span className="sidebar-badge number-badge">
                  {counts.savedAddresses}
                </span>
              </Link>

              {/* 4. Wishlist */}
              <Link to="/wishlist" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>Wishlist</span>
                </div>
                <span className="sidebar-badge number-badge">
                  {counts.wishlistItems} items
                </span>
              </Link>

              {/* 5. Wallet & Credits */}
              <a
                href="#wallet"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Corvun Wallet passbook is running in local demonstration mode.");
                }}
                className="sidebar-nav-item"
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span>Wallet & Credits</span>
                </div>
                <span className="sidebar-badge wallet-badge">
                  $1,420.00
                </span>
              </a>

              {/* 6. My Reviews */}
              <a
                href="#reviews"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Hardware feedback module is synchronizing with reviews node.");
                }}
                className="sidebar-nav-item"
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>My Reviews</span>
                </div>
                <span className="sidebar-badge number-badge">14</span>
              </a>

              {/* 7. Questions & Answers */}
              <a
                href="#qa"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Community Q&A terminal node is operational.");
                }}
                className="sidebar-nav-item"
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Questions & Answers</span>
                </div>
              </a>

              {/* 8. Referrals */}
              <a
                href="#referrals"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Referral network telemetry active: 1 bonus token pending.");
                }}
                className="sidebar-nav-item"
              >
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span>Referrals</span>
                </div>
                <span className="sidebar-dot-badge" />
              </a>

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
                  <span>Log Out</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Need Assistance Support Card */}
          <div className="sidebar-assistance-card">
            <div className="assistance-title-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef3842" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
              <h4 className="assistance-title">Need Assistance?</h4>
            </div>
            <p className="assistance-text">
              Our technical customer support team is available 24/7 for order and build queries.
            </p>
            <a
              href="mailto:support@corvun.io"
              className="assistance-link"
              onClick={(e) => {
                e.preventDefault();
                showToast("Support desk dispatched: ticket priority tier 1.");
              }}
            >
              Contact Support →
            </a>
          </div>
        </aside>

        {/* Right Column: Profile Content */}
        <main className="profile-main-content">
          {/* Card 1: Profile Header Banner */}
          <section className="profile-card profile-banner-card">
            <div className="profile-banner-left">
              <div className="profile-avatar-container">
                <div className="profile-avatar-glow" />
                <div className="profile-avatar-inner">
                  {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : "V"}
                </div>
              </div>

              <div className="profile-banner-meta">
                <div className="profile-name-tier-row">
                  <h2 className="profile-user-fullname">{profileData.fullName}</h2>
                  <span className="profile-tier-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>{profileData.membershipTier}</span>
                  </span>
                </div>

                <div className="profile-contact-line">
                  <span className="contact-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>{profileData.email}</span>
                  </span>
                  <span className="contact-meta-bullet">•</span>
                  <span className="contact-meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{profileData.phone}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenEdit}
              className="profile-primary-edit-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          </section>

          {/* Card 2: Personal Details */}
          <section className="profile-card personal-details-card">
            <div className="card-header-bar">
              <div className="card-header-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3>Personal Details</h3>
              </div>

              <button
                type="button"
                onClick={handleOpenEdit}
                className="card-header-edit-link"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit</span>
              </button>
            </div>

            <div className="personal-details-grid">
              {/* Field 1: Full Name */}
              <div className="detail-item-container">
                <span className="detail-item-label">FULL NAME</span>
                <div className="detail-input-display">
                  <span className="detail-item-value">{profileData.fullName}</span>
                  <svg className="detail-box-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>

              {/* Field 2: Email Address */}
              <div className="detail-item-container">
                <span className="detail-item-label">EMAIL ADDRESS</span>
                <div className="detail-input-display">
                  <span className="detail-item-value">{profileData.email}</span>
                  <span className="verified-status-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              {/* Field 3: Mobile Number */}
              <div className="detail-item-container">
                <span className="detail-item-label">MOBILE NUMBER</span>
                <div className="detail-input-display">
                  <span className="detail-item-value">{profileData.phone}</span>
                  <span className="verified-status-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              {/* Field 4: Date of Birth */}
              <div className="detail-item-container">
                <span className="detail-item-label">DATE OF BIRTH</span>
                <div className="detail-input-display">
                  <span className="detail-item-value">{formatDisplayDate(profileData.dob)}</span>
                  <svg className="detail-box-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>

              {/* Field 5: Gender */}
              <div className="detail-item-container">
                <span className="detail-item-label">GENDER</span>
                <div className="detail-input-display">
                  <span className="detail-item-value">{profileData.gender}</span>
                  <svg className="detail-box-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* Card 3: Corvun Wallet & Credits */}
          <section className="profile-card wallet-credits-card" id="wallet">
            <div className="card-header-bar">
              <div className="card-header-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <h3>Corvun Wallet & Credits</h3>
              </div>

              <a
                href="#passbook"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Wallet ledger: ₹4,850.00 verified on blockchain node.");
                }}
                className="wallet-passbook-action"
              >
                <span>View Passbook / Transactions</span>
                <span className="passbook-arrow">→</span>
              </a>
            </div>

            <div className="wallet-content-row">
              {/* Left Column: Balance Info */}
              <div className="wallet-balance-pane">
                <span className="wallet-balance-caption">AVAILABLE BALANCE</span>
                <div className="wallet-amount-row">
                  <span className="wallet-amount-text">₹4,850.00</span>
                  <span className="wallet-active-pill">ACTIVE</span>
                </div>
                <div className="wallet-subtext-meta">
                  <span className="subtext-entry">
                    <span className="subtext-icon">🪙</span>
                    <span>₹350 Cashback Pending</span>
                  </span>
                  <span className="subtext-bullet">•</span>
                  <span className="subtext-entry">
                    <span className="subtext-icon">🏷️</span>
                    <span>120 Reward Points</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Instant Top-Up Box */}
              <div className="wallet-topup-card">
                <h4 className="topup-card-title">Instant Top-Up</h4>
                <p className="topup-card-desc">
                  Add balance using UPI, Credit Cards, or Net Banking for instant checkout on parts and rigs.
                </p>
                <button
                  type="button"
                  onClick={() => showToast("Direct checkout gateway active. Use UPI/Cards at Checkout.")}
                  className="wallet-add-money-btn"
                >
                  <span>+ + Add Money</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Cyberpunk Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="profile-modal-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div className="modal-header-banner">
              <div className="modal-header-title-group">
                <span className="modal-cyber-prefix">// UPDATE PROTOCOL:</span>
                <h3 id="modal-title" className="modal-main-title">Edit Workstation Profile</h3>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-modal-form">
              <div className="modal-form-fields-grid">
                {/* Full Name */}
                <div className="modal-field-group">
                  <label htmlFor="edit-name" className="modal-label">
                    Full Name <span className="modal-req">*</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={editFormData.fullName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, fullName: e.target.value })
                    }
                    className="modal-input"
                    placeholder="Enter full legal name"
                  />
                </div>

                {/* Email (Read Only with explanation) */}
                <div className="modal-field-group">
                  <label htmlFor="edit-email" className="modal-label">
                    Email Address <span className="modal-lock">(Locked)</span>
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    disabled
                    value={editFormData.email}
                    className="modal-input disabled-input"
                  />
                  <span className="modal-hint">
                    Security email linked with encrypted dual-factor authentication.
                  </span>
                </div>

                {/* Mobile Phone */}
                <div className="modal-field-group">
                  <label htmlFor="edit-phone" className="modal-label">
                    Mobile Number <span className="modal-req">*</span>
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="modal-input"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                {/* Date of Birth */}
                <div className="modal-field-group">
                  <label htmlFor="edit-dob" className="modal-label">
                    Date of Birth
                  </label>
                  <input
                    id="edit-dob"
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dob: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                {/* Gender */}
                <div className="modal-field-group">
                  <label htmlFor="edit-gender" className="modal-label">
                    Gender
                  </label>
                  <select
                    id="edit-gender"
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, gender: e.target.value })
                    }
                    className="modal-input modal-select"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="modal-save-btn"
                >
                  {isSaving ? "Saving Credentials..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerProfile;
