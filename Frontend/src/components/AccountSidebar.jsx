import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAddresses, getMyOrders } from "../services/orderService";
import { getWishlist } from "../services/cartService";
import "./AccountSidebar.css";

// SVG Icons
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ReferralsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const TruckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const HeartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const WalletIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h0M2 9.5h20" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function AccountSidebar({ activeItem = "personal-info" }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [counts, setCounts] = useState({
    activeOrders: 1,
    savedAddresses: 2,
    wishlistItems: 7,
  });

  // Load actual badge counters
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    Promise.allSettled([
      getMyOrders(),
      getAddresses(),
      getWishlist(),
    ]).then(([ordersRes, addressesRes, wishlistRes]) => {
      if (!isMounted) return;

      let activeCount = 1;
      let addressCount = 2;
      let wishlistCount = 7;

      if (ordersRes.status === "fulfilled") {
        const orderList = Array.isArray(ordersRes.value?.orders)
          ? ordersRes.value.orders
          : [];
        const activeOrders = orderList.filter((o) =>
          ["pending", "processing", "shipped"].includes((o.status || "").toLowerCase())
        );
        activeCount = activeOrders.length > 0 ? activeOrders.length : 1;
      }

      if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value)) {
        addressCount = addressesRes.value.length;
      }

      if (wishlistRes.status === "fulfilled") {
        const items = wishlistRes.value?.items || wishlistRes.value || [];
        if (Array.isArray(items) && items.length > 0) {
          wishlistCount = items.length;
        }
      }

      setCounts({
        activeOrders: activeCount,
        savedAddresses: addressCount,
        wishlistItems: wishlistCount,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

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

  // User avatar initials
  const initials = (() => {
    if (user?.full_name && typeof user.full_name === "string") {
      const parts = user.full_name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.full_name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "KR";
  })();

  const displayName = user?.full_name || "krizz";
  const displayEmail = user?.email || "krizzz123@gamil.com";

  return (
    <aside className="corvun-account-sidebar">
      {/* 1. User Profile Mini Card */}
      <div className="account-sidebar-profile-card">
        <div className="account-avatar-wrapper">
          <div className="account-avatar-circle">{initials}</div>
          <span className="account-online-dot" />
        </div>
        <h3 className="account-user-name">{displayName}</h3>
        <p className="account-user-email">{displayEmail}</p>
        <div className="account-level-badge">LEVEL 3 BUILDER</div>
      </div>

      {/* 2. Navigation Card */}
      <div className="account-sidebar-nav-card">
        {/* GROUP 1: MANAGE ACCOUNT */}
        <div className="account-sidebar-group-label">MANAGE ACCOUNT</div>
        <nav className="account-sidebar-nav-list">
          {/* 1. Personal Information */}
          <Link
            to="/profile"
            className={`account-nav-item ${activeItem === "personal-info" ? "active-nav-pill" : ""}`}
          >
            <div className="account-nav-left">
              <UserIcon />
              <span>Personal Information</span>
            </div>
            {activeItem === "personal-info" && (
              <span className="account-active-tag">ACTIVE</span>
            )}
          </Link>

          {/* 2. Addresses */}
          <Link
            to="/addresses"
            className={`account-nav-item ${activeItem === "addresses" ? "active-nav-pill" : ""}`}
          >
            <div className="account-nav-left">
              <MapPinIcon />
              <span>Addresses</span>
            </div>
            {activeItem === "addresses" ? (
              <span className="account-active-tag">ACTIVE</span>
            ) : (
              <span className="account-badge number-badge">{counts.savedAddresses}</span>
            )}
          </Link>

          {/* 3. My Reviews */}
          <div
            className={`account-nav-item ${activeItem === "reviews" ? "active-nav-pill" : ""}`}
            style={{ cursor: "pointer" }}
          >
            <div className="account-nav-left">
              <StarIcon />
              <span>My Reviews</span>
            </div>
            {activeItem === "reviews" ? (
              <span className="account-active-tag">ACTIVE</span>
            ) : (
              <span className="account-badge number-badge">14</span>
            )}
          </div>

          {/* 4. Referrals */}
          <Link
            to="/referrals"
            className={`account-nav-item ${activeItem === "referrals" ? "active-nav-pill" : ""}`}
          >
            <div className="account-nav-left">
              <ReferralsIcon />
              <span>Referrals</span>
            </div>
            {activeItem === "referrals" ? (
              <span className="account-active-tag">ACTIVE</span>
            ) : (
              <span className="account-badge number-badge">1</span>
            )}
          </Link>

          {/* 5. Questions & Answers */}
          <div
            className={`account-nav-item ${activeItem === "questions" ? "active-nav-pill" : ""}`}
            style={{ cursor: "pointer" }}
          >
            <div className="account-nav-left">
              <HelpIcon />
              <span>Questions &amp; Answers</span>
            </div>
          </div>
        </nav>

        {/* GROUP 2: ORDERS & WALLET */}
        <div className="account-sidebar-group-label" style={{ marginTop: "18px" }}>
          ORDERS &amp; WALLET
        </div>
        <nav className="account-sidebar-nav-list">
          {/* 6. My Orders */}
          <Link
            to="/my-orders"
            className={`account-nav-item ${activeItem === "orders" ? "active-nav-pill" : ""}`}
          >
            <div className="account-nav-left">
              <TruckIcon />
              <span>My Orders</span>
            </div>
            {activeItem === "orders" ? (
              <span className="account-active-tag">ACTIVE</span>
            ) : (
              <span className="account-badge active-orders-badge">
                {counts.activeOrders} Active
              </span>
            )}
          </Link>

          {/* 7. Wishlist */}
          <Link
            to="/wishlist"
            className={`account-nav-item ${activeItem === "wishlist" ? "active-nav-pill" : ""}`}
          >
            <div className="account-nav-left">
              <HeartIcon />
              <span>Wishlist</span>
            </div>
            {activeItem === "wishlist" ? (
              <span className="account-active-tag">ACTIVE</span>
            ) : (
              <span className="account-badge number-badge">{counts.wishlistItems}</span>
            )}
          </Link>

          {/* 8. Wallet & Credits */}
          <Link
            to="/profile#wallet"
            className={`account-nav-item ${activeItem === "wallet" ? "active-nav-pill" : ""}`}
          >
            <div className="account-nav-left">
              <WalletIcon />
              <span>Wallet &amp; Credits</span>
            </div>
            <span className="account-badge wallet-badge">₹4,850.00</span>
          </Link>

          {/* 9. Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="account-nav-item account-logout-item"
          >
            <div className="account-nav-left">
              <LogoutIcon />
              <span>Logout</span>
            </div>
          </button>
        </nav>
      </div>

      {/* 3. Concierge Assistance Card */}
      <div className="account-sidebar-assistance-card">
        <div className="account-assistance-header">
          <span className="account-assistance-ping" />
          <span className="account-assistance-tag">HARDWARE CONCIERGE</span>
        </div>
        <p className="account-assistance-desc">
          Questions about your workstation orders, warranty, or rig builds? Our specialists are online.
        </p>
        <Link to="/profile" className="account-assistance-link">
          Open Support Ticket →
        </Link>
      </div>
    </aside>
  );
}
