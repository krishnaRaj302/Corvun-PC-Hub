import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getMyOrders,
} from "../services/orderService";
import { getWishlist } from "../services/cartService";
import "./SavedAddresses.css";

function SavedAddresses() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();

  // Address data & page states
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Sidebar badge metrics
  const [counts, setCounts] = useState({
    activeOrders: 1,
    savedAddresses: 0,
    wishlistItems: 7,
  });

  // Modal states: 'add', 'edit', 'delete', or null
  const [activeModal, setActiveModal] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const defaultFormData = {
    label: "Home",
    full_name: user?.full_name || "Vikramaditya Rao",
    phone: "",
    alternative_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false,
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Auto-dismiss toast feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Load addresses & sidebar metrics safely
  const loadAddresses = useCallback(() => {
    let isMounted = true;

    Promise.allSettled([
      getAddresses(),
      getMyOrders(),
      getWishlist(),
    ]).then(([addrRes, ordersRes, wishRes]) => {
      if (!isMounted) return;

      let addrList = [];
      if (addrRes.status === "fulfilled") {
        addrList = Array.isArray(addrRes.value?.addresses)
          ? addrRes.value.addresses
          : Array.isArray(addrRes.value)
          ? addrRes.value
          : [];
        setAddresses(addrList);
        setError("");
      } else {
        console.error("Failed to fetch addresses:", addrRes.reason);
        setError("Unable to interrogate address node repository. Check connectivity.");
      }

      let activeCount = 1;
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value?.orders)) {
        const active = ordersRes.value.orders.filter(
          (o) =>
            o.status?.toLowerCase() === "pending" ||
            o.status?.toLowerCase() === "processing" ||
            o.status?.toLowerCase() === "shipped"
        ).length;
        if (active > 0) activeCount = active;
      }

      let wishCount = 7;
      if (wishRes.status === "fulfilled") {
        const items = wishRes.value?.items || wishRes.value || [];
        if (Array.isArray(items) && items.length > 0) {
          wishCount = items.length;
        }
      }

      setCounts({
        activeOrders: activeCount,
        savedAddresses: addrList.length,
        wishlistItems: wishCount,
      });

      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout notice:", err);
      navigate("/login");
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      label: "Home",
      full_name: user?.full_name || "Vikramaditya Rao",
      phone: "",
      alternative_phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India",
      is_default: addresses.length === 0,
    });
    setEditingAddressId(null);
    setActiveModal("add");
  };

  // Open Edit Modal
  const handleOpenEdit = (addr) => {
    setEditingAddressId(addr.id);
    setFormData({
      label: addr.label || "Home",
      full_name: addr.full_name || user?.full_name || "Vikramaditya Rao",
      phone: addr.phone || "",
      alternative_phone: addr.alternative_phone || "",
      address_line1: addr.address_line1 || "",
      address_line2: addr.address_line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      postal_code: addr.postal_code || "",
      country: addr.country || "India",
      is_default: Boolean(addr.is_default),
    });
    setActiveModal("edit");
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (addrId) => {
    setDeletingAddressId(addrId);
    setActiveModal("delete");
  };

  // Close Any Modal
  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingAddressId(null);
    setDeletingAddressId(null);
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit Add or Edit Address
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        user: user?.id,
      };

      if (activeModal === "add") {
        const res = await addAddress(payload);
        const created = res?.address;
        if (created) {
          setAddresses((prev) => [created, ...prev]);
          setCounts((prev) => ({ ...prev, savedAddresses: prev.savedAddresses + 1 }));
        } else {
          loadAddresses();
        }
        setFeedback({
          type: "success",
          message: "Address node registered successfully in delivery manifest.",
        });
      } else if (activeModal === "edit" && editingAddressId) {
        const res = await updateAddress(editingAddressId, payload);
        const updated = res?.address;
        if (updated) {
          setAddresses((prev) =>
            prev.map((a) => (a.id === editingAddressId ? updated : a))
          );
        } else {
          loadAddresses();
        }
        setFeedback({
          type: "success",
          message: "Address node telemetry updated successfully.",
        });
      }

      handleCloseModal();
    } catch (err) {
      console.error("Address operation failed:", err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Failed to save address node. Please verify input fields.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Address
  const handleConfirmDelete = async () => {
    if (!deletingAddressId) return;
    setIsSubmitting(true);

    try {
      await deleteAddress(deletingAddressId);
      setAddresses((prev) => prev.filter((a) => a.id !== deletingAddressId));
      setCounts((prev) => ({
        ...prev,
        savedAddresses: Math.max(0, prev.savedAddresses - 1),
      }));
      setFeedback({
        type: "success",
        message: "Address node decommissioned from dispatch ledger.",
      });
      handleCloseModal();
    } catch (err) {
      console.error("Failed to delete address:", err);
      setFeedback({
        type: "error",
        message: "Failed to remove address node. Please retry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Address as Default
  const handleSetDefault = async (addr) => {
    try {
      const res = await updateAddress(addr.id, {
        ...addr,
        is_default: true,
        user: user?.id,
      });

      const updated = res?.address;
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addr.id ? true : false,
        }))
      );

      if (!updated) {
        loadAddresses();
      }

      setFeedback({
        type: "success",
        message: `Node ${addr.label || "Address"} designated as primary dispatch destination.`,
      });
    } catch (err) {
      console.error("Failed to set default address:", err);
      setFeedback({
        type: "error",
        message: "Could not establish primary routing. Try again.",
      });
    }
  };

  // Unauthenticated Guard View
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="addresses-page-wrapper">
        <div className="addresses-unauth-box">
          <div className="unauth-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="unauth-code-tag">// LOGISTICS_DISPATCH_ACCESS</span>
          <h2 className="unauth-heading">Authentication Required</h2>
          <p className="unauth-description">
            Sign in to your Corvun customer account to inspect, provision, and configure delivery coordinates.
          </p>
          <Link to="/login" className="unauth-action-btn">
            Access Account Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="addresses-page-wrapper">
      {/* Toast Feedback Banner */}
      {feedback && (
        <div className={`addresses-toast-alert alert-${feedback.type}`} role="alert">
          <span className="toast-dot" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Breadcrumb & Page Header */}
      <div className="addresses-header-container">
        <nav className="addresses-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/profile" className="breadcrumb-link">My Account</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Saved Addresses</span>
        </nav>

        <div className="addresses-title-row">
          <div>
            <span className="addresses-prefix-tag">
              LOGISTICS NODES // {addresses.length} PROVISIONED
            </span>
            <h1 className="addresses-headline">Saved Addresses</h1>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="addresses-add-new-btn"
          >
            <span className="add-plus-symbol">+</span>
            <span>Add New Address</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Workstation Grid */}
      <div className="addresses-workspace-grid">
        {/* Left Column: Account Navigation Sidebar */}
        <aside className="addresses-sidebar">
          <div className="sidebar-nav-card">
            <div className="sidebar-header-label">ACCOUNT NAVIGATION</div>

            <nav className="sidebar-nav-list">
              {/* 1. Personal Info */}
              <Link to="/profile" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Personal Info</span>
                </div>
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

              {/* 3. Saved Addresses (Active Pill) */}
              <Link to="/addresses" className="sidebar-nav-item active-nav-pill">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Saved Addresses</span>
                </div>
                <div className="nav-item-right-group">
                  <span className="sidebar-badge number-badge-active">
                    {addresses.length}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>

              {/* 4. Wishlist */}
              <Link to="/wishlist" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>Wishlist</span>
                </div>
                <span className="sidebar-badge number-badge">{counts.wishlistItems} items</span>
              </Link>

              {/* 5. Wallet & Credits */}
              <Link to="/profile#wallet" className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span>Wallet &amp; Credits</span>
                </div>
                <span className="sidebar-badge wallet-badge">$1,420.00</span>
              </Link>

              {/* 6. My Reviews */}
              <div className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>My Reviews</span>
                </div>
                <span className="sidebar-badge number-badge">14</span>
              </div>

              {/* 7. Questions & Answers */}
              <div className="sidebar-nav-item">
                <div className="nav-item-left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Questions &amp; Answers</span>
                </div>
              </div>

              {/* 8. Referrals */}
              <div className="sidebar-nav-item">
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
              </div>

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

          {/* Need Assistance Card */}
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
                setFeedback({
                  type: "info",
                  message: "Support dispatch desk notified: telemetry connection verified.",
                });
              }}
            >
              Contact Support →
            </a>
          </div>
        </aside>

        {/* Right Column: Saved Addresses Content Area */}
        <main className="addresses-main-content">
          {/* Error Banner */}
          {error && (
            <div className="addresses-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Loading View */}
          {loading ? (
            <div className="addresses-loading-box">
              <div className="corvun-spinner" />
              <p className="loading-text">INTERROGATING LOGISTICS DISPATCH NODES...</p>
            </div>
          ) : addresses.length === 0 ? (
            /* Empty State */
            <div className="addresses-empty-card">
              <div className="empty-location-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span className="empty-prefix-code">// NO_ADDRESS_NODES_FOUND</span>
              <h3 className="empty-card-title">No Saved Delivery Addresses</h3>
              <p className="empty-card-description">
                You haven&apos;t provisioned any dispatch addresses yet. Register your shipping coordinates
                to enable instant single-click order routing.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="empty-add-address-btn"
              >
                <span>+ Add Your First Address</span>
              </button>
            </div>
          ) : (
            /* Addresses Grid (2 columns matching Image 1) */
            <div className="addresses-cards-grid">
              {addresses.map((addr, index) => {
                const nodeCode = `NODE-${String(index + 1).padStart(2, "0")}`;
                return (
                  <div
                    key={addr.id}
                    className={`address-item-card ${addr.is_default ? "is-default-card" : ""}`}
                  >
                    {/* Top Row: Label & Default Badge & Node Code */}
                    <div className="address-card-top-row">
                      <div className="address-tags-left">
                        {addr.is_default && (
                          <span className="default-red-pill">DEFAULT</span>
                        )}
                        <span className="address-label-badge">
                          {addr.label || "Home"}
                        </span>
                      </div>
                      <span className="address-node-code">{nodeCode}</span>
                    </div>

                    {/* Recipient Full Name */}
                    <h3 className="address-recipient-name">
                      {addr.full_name || user?.full_name || "Vikramaditya Rao"}
                    </h3>

                    {/* Formatted Address Lines */}
                    <p className="address-street-text">
                      {addr.address_line1}
                      {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                      {addr.city ? `, ${addr.city}` : ""}
                      {addr.state ? `, ${addr.state}` : ""}
                      {addr.postal_code ? ` ${addr.postal_code}` : ""}
                      {addr.country ? `, ${addr.country}` : ""}
                    </p>

                    {/* Phone Number */}
                    <div className="address-phone-line">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{addr.phone || "+91 98840 54321"}</span>
                      {addr.alternative_phone && (
                        <span className="alt-phone-span">/ {addr.alternative_phone}</span>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="address-card-bottom-row">
                      <div className="address-default-control">
                        {addr.is_default ? (
                          <div className="telemetry-verified-status">
                            <span className="telemetry-green-dot" />
                            <span>TELEMETRY: VERIFIED</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr)}
                            className="set-default-action-btn"
                          >
                            SET AS DEFAULT
                          </button>
                        )}
                      </div>

                      <div className="address-card-actions">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(addr)}
                          className="address-action-link"
                          title="Edit Address"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDelete(addr.id)}
                          className="address-action-link delete-link"
                          title="Delete Address"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Security / Anti-Shock Banner Card (Image 1 Match) */}
          <section className="addresses-security-banner-card">
            <div className="security-banner-left">
              <div className="security-icon-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="security-meta-text">
                <h4 className="security-banner-heading">Anti-Shock Insured Dispatch</h4>
                <p className="security-banner-desc">
                  All components dispatched to saved addresses include vibration-dampened telemetry seals
                  and identity confirmation on release.
                </p>
              </div>
            </div>

            <div className="security-banner-right">
              <span className="protocol-red-dot" />
              <span className="protocol-version-code">ROUTER PROTOCOL V4.2</span>
            </div>
          </section>
        </main>
      </div>

      {/* =====================================================================
          ADD / EDIT ADDRESS MODAL (Image 2 & 3 Match)
          ===================================================================== */}
      {(activeModal === "add" || activeModal === "edit") && (
        <div className="address-modal-overlay" onClick={handleCloseModal}>
          <div
            className="address-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="address-modal-title"
          >
            <div className="address-modal-header">
              <h3 id="address-modal-title" className="address-modal-title">
                {activeModal === "add" ? "Add New Address" : "Edit Address"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="address-modal-close-btn"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="address-modal-form">
              {/* Address Label */}
              <div className="form-input-group">
                <label htmlFor="addr-label" className="form-input-label">
                  Address Label
                </label>
                <input
                  id="addr-label"
                  name="label"
                  type="text"
                  value={formData.label}
                  onChange={handleFormChange}
                  placeholder="Home"
                  className="form-input-field"
                />
              </div>

              {/* Address Line 1 */}
              <div className="form-input-group">
                <label htmlFor="addr-line1" className="form-input-label">
                  Address Line 1 <span className="req-star">*</span>
                </label>
                <input
                  id="addr-line1"
                  name="address_line1"
                  type="text"
                  required
                  value={formData.address_line1}
                  onChange={handleFormChange}
                  placeholder="Street address, P.O. box"
                  className="form-input-field"
                />
              </div>

              {/* Address Line 2 */}
              <div className="form-input-group">
                <label htmlFor="addr-line2" className="form-input-label">
                  Address Line 2
                </label>
                <input
                  id="addr-line2"
                  name="address_line2"
                  type="text"
                  value={formData.address_line2}
                  onChange={handleFormChange}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  className="form-input-field"
                />
              </div>

              {/* Phone Number */}
              <div className="form-input-group">
                <label htmlFor="addr-phone" className="form-input-label">
                  Phone Number <span className="req-star">*</span>
                </label>
                <input
                  id="addr-phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="Enter your phone number"
                  className="form-input-field"
                />
              </div>

              {/* Alternative Phone Number */}
              <div className="form-input-group">
                <label htmlFor="addr-alt-phone" className="form-input-label">
                  Alternative Phone Number
                </label>
                <input
                  id="addr-alt-phone"
                  name="alternative_phone"
                  type="tel"
                  value={formData.alternative_phone}
                  onChange={handleFormChange}
                  placeholder="Enter your phone number"
                  className="form-input-field"
                />
              </div>

              {/* City and State (2 columns) */}
              <div className="form-row-2col">
                <div className="form-input-group">
                  <label htmlFor="addr-city" className="form-input-label">
                    City <span className="req-star">*</span>
                  </label>
                  <input
                    id="addr-city"
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="City"
                    className="form-input-field"
                  />
                </div>

                <div className="form-input-group">
                  <label htmlFor="addr-state" className="form-input-label">
                    State <span className="req-star">*</span>
                  </label>
                  <input
                    id="addr-state"
                    name="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={handleFormChange}
                    placeholder="State"
                    className="form-input-field"
                  />
                </div>
              </div>

              {/* ZIP Code and Country (2 columns) */}
              <div className="form-row-2col">
                <div className="form-input-group">
                  <label htmlFor="addr-zip" className="form-input-label">
                    ZIP Code <span className="req-star">*</span>
                  </label>
                  <input
                    id="addr-zip"
                    name="postal_code"
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={handleFormChange}
                    placeholder="ZIP Code"
                    className="form-input-field"
                  />
                </div>

                <div className="form-input-group">
                  <label htmlFor="addr-country" className="form-input-label">
                    Country <span className="req-star">*</span>
                  </label>
                  <input
                    id="addr-country"
                    name="country"
                    type="text"
                    required
                    value={formData.country}
                    onChange={handleFormChange}
                    placeholder="Country"
                    className="form-input-field"
                  />
                </div>
              </div>

              {/* Optional Set as Default Checkbox */}
              <div className="form-checkbox-line">
                <label className="checkbox-label-wrapper">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleFormChange}
                    className="form-checkbox-input"
                  />
                  <span>Designate this node as my primary default address</span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="address-modal-footer">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="modal-primary-submit-btn"
                >
                  {isSubmitting
                    ? "Persisting..."
                    : activeModal === "add"
                    ? "Add Address"
                    : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="modal-secondary-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DELETE CONFIRMATION MODAL
          ===================================================================== */}
      {activeModal === "delete" && (
        <div className="address-modal-overlay" onClick={handleCloseModal}>
          <div
            className="address-modal-container delete-confirm-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="delete-dialog-title"
          >
            <div className="delete-dialog-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>

            <h3 id="delete-dialog-title" className="delete-dialog-title">
              Decommission Address Node?
            </h3>
            <p className="delete-dialog-desc">
              Are you sure you want to remove this shipping destination from your profile?
              Any active orders already dispatched will not be affected.
            </p>

            <div className="delete-dialog-actions">
              <button
                type="button"
                onClick={handleCloseModal}
                className="delete-cancel-btn"
              >
                Keep Address
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="delete-confirm-btn"
              >
                {isSubmitting ? "Decommissioning..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedAddresses;

