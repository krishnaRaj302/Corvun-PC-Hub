import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./Navbar.css";

// Corvun Diamond Logo Icon
export const CorvunLogo = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="corvun-navbar-icon"
  >
    <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="var(--corvun-red)" />
    <rect
      x="8.5"
      y="8.5"
      width="7"
      height="7"
      transform="rotate(45 12 12)"
      fill="var(--corvun-bg)"
    />
  </svg>
);

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="corvun-navbar">
      {/* Top Protocol Bar */}
      <div className="navbar-telemetry-bar">
        <div className="telemetry-bar-inner">
          <div className="telemetry-item">
            <span className="telemetry-dot green-dot" />
            <span>CORVUN_NODE // EU-NORTH-01</span>
          </div>
          <div className="telemetry-item hide-mobile">
            <span>PROTOCOL: HIGH-PERFORMANCE LIQUID WORKSTATIONS</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-dot red-dot" />
            <span>TELEMETRY: OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="navbar-main-container">
        <div className="navbar-brand-section">
          <Link to="/" className="navbar-brand-link">
            <CorvunLogo />
            <div className="navbar-brand-col">
              <div className="navbar-brand-row">
                <span className="navbar-brand-text">CORVUN</span>
                <span className="navbar-brand-dot">•</span>
              </div>
              <span className="navbar-brand-subtext">BUILD BEYOND LIMITS</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className={`navbar-links-nav ${mobileMenuOpen ? "open" : ""}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link-item ${isActive ? "active" : ""}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) =>
              `nav-link-item ${isActive ? "active" : ""}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            Components
          </NavLink>

          <NavLink
            to="/pc-builder"
            className={({ isActive }) =>
              `nav-link-item ${isActive ? "active" : ""}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            PC Builder
          </NavLink>

          <NavLink
            to="/products?sort=price_low"
            className={({ isActive }) =>
              `nav-link-item ${isActive ? "active" : ""}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            Deals
          </NavLink>
        </nav>

        {/* Search Bar */}
        <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="navbar-search-input"
              placeholder="Search components, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Right Actions: Wishlist, Cart, User Profile / Login */}
        <div className="navbar-actions-group">
          <Link
            to="/wishlist"
            className="action-icon-btn"
            title="Hardware Wishlist"
            aria-label="Wishlist"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>

          <Link
            to="/cart"
            className="action-icon-btn cart-btn"
            title="Cart"
            aria-label="Shopping Cart"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="cart-badge-indicator">{cartCount}</span>
          </Link>

          {/* User Session */}
          {isAuthenticated ? (
            <div className="user-dropdown-container">
              <button
                type="button"
                className="user-profile-trigger"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="user-avatar-circle">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="user-profile-name hide-mobile">
                  {user?.full_name?.split(" ")[0] || "User"}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div
                  className="user-dropdown-menu"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <Link
                    to="/profile"
                    className="dropdown-user-header"
                    onClick={() => setUserDropdownOpen(false)}
                    title="View Personal Profile"
                  >
                    <span className="dropdown-name">{user?.full_name}</span>
                    <span className="dropdown-email">{user?.email}</span>
                    <span className="dropdown-role-badge">{user?.role}</span>
                  </Link>

                  <div className="dropdown-divider" />

                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>User Profile</span>
                  </Link>

                  <Link
                    to="/my-orders"
                    className="dropdown-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>My Orders</span>
                  </Link>

                  <Link
                    to="/addresses"
                    className="dropdown-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Saved Addresses</span>
                  </Link>

                  <Link
                    to="/wishlist"
                    className="dropdown-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>My Wishlist</span>
                  </Link>

                  {user?.role === "admin" && (
                    <Link
                      to="/admin/dashboard"
                      className="dropdown-item admin-link"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" y1="19" x2="20" y2="19" />
                      </svg>
                      <span>Admin Terminal</span>
                    </Link>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    type="button"
                    className="dropdown-item logout-btn"
                    onClick={handleLogout}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Disconnect // Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="action-icon-btn user-btn" title="Sign In" aria-label="Sign In">
              <div className="user-avatar-circle guest-avatar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </Link>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
            <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
            <span className={`bar ${mobileMenuOpen ? "open" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;