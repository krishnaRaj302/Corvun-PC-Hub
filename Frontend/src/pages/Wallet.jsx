import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccountSidebar from "../components/AccountSidebar";
import {
  getWalletData,
  addFunds,
  syncReferralEarnings,
  formatCurrency,
  subscribeWallet,
} from "../services/walletService";
import "./Wallet.css";

// SVG Icons
const WalletIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h0M2 9.5h20" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowDownLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="17" y1="7" x2="7" y2="17" />
    <polyline points="17 17 7 17 7 7" />
  </svg>
);

const ArrowUpRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Wallet() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Wallet Data State
  const [walletState, setWalletState] = useState(() => getWalletData(user));
  const loading = false;

  // Filter & Search State
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "credit" | "debit" | "referral"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"

  // Add Money Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Initial Sync & Listeners
  useEffect(() => {
    let isMounted = true;

    // Sync referral earnings if authenticated
    if (user) {
      syncReferralEarnings(user).then((synced) => {
        if (isMounted && synced) {
          setWalletState(synced);
        }
      });
    }

    // Subscribe to any updates across windows/components
    const unsubscribe = subscribeWallet((detail) => {
      if (isMounted && detail?.ledger) {
        setWalletState(detail.ledger);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // Check URL query param ?action=topup to open modal
  useEffect(() => {
    if (searchParams.get("action") === "topup") {
      Promise.resolve().then(() => {
        setIsTopUpOpen(true);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("action");
        setSearchParams(nextParams, { replace: true });
      });
    }
  }, [searchParams, setSearchParams]);

  // Handle Top-Up Submission
  const handleTopUpSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(topUpAmount);

    if (isNaN(amountNum) || amountNum < 100) {
      showToast("Minimum top-up amount is ₹100.00", "error");
      return;
    }

    if (amountNum > 100000) {
      showToast("Maximum instant top-up limit per node is ₹1,00,000.00", "error");
      return;
    }

    setIsProcessing(true);

    // Simulated cryptographic payment authorization
    setTimeout(() => {
      try {
        const updated = addFunds(
          user,
          amountNum,
          paymentMethod,
          `Instant Top-Up via ${paymentMethod}`
        );
        setWalletState(updated);
        setIsProcessing(false);
        setIsTopUpOpen(false);
        setTopUpAmount("1000");
        showToast(
          `Success: ${formatCurrency(amountNum)} added to your Corvun Wallet.`
        );
      } catch (err) {
        console.error("Top-up failed", err);
        setIsProcessing(false);
        showToast("Transaction rejected by dispatch terminal. Please retry.", "error");
      }
    }, 600);
  };

  // Quick preset chips
  const handlePresetSelect = (preset) => {
    setTopUpAmount(String(preset));
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(walletState?.transactions) ? [...walletState.transactions] : [];

    // Filter by type
    if (typeFilter === "credit") {
      list = list.filter((t) => t.type === "credit");
    } else if (typeFilter === "debit") {
      list = list.filter((t) => t.type === "debit");
    } else if (typeFilter === "referral") {
      list = list.filter((t) => t.category === "referral" || t.category === "backend_referral");
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.id || "").toLowerCase().includes(q) ||
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q) ||
          (t.paymentMethod || "").toLowerCase().includes(q)
      );
    }

    // Sort order
    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [walletState, typeFilter, searchQuery, sortOrder]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "Recent Date";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Unauthenticated Guard
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="wallet-page-wrapper">
        <div className="wallet-unauth-card">
          <div className="unauth-icon-box">
            <WalletIcon />
          </div>
          <span className="unauth-code">// ENCRYPTED_LEDGER_ACCESS</span>
          <h2 className="unauth-title">Authentication Required</h2>
          <p className="unauth-desc">
            Please log in with your verified Corvun terminal profile to view your active credits balance, instant checkout wallet, and ledger transactions.
          </p>
          <Link to="/login" className="unauth-login-btn">
            ACCESS TERMINAL →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-page-wrapper">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`wallet-toast-banner ${toastMessage.type}`} role="alert">
          <span className="toast-dot" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Breadcrumb & Page Header (Master Reference from CustomerProfile) */}
      <div className="wallet-header-container">
        <nav className="wallet-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/profile" className="breadcrumb-link">My Account</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Wallet &amp; Credits</span>
        </nav>

        <div className="wallet-title-row">
          <div>
            <span className="wallet-prefix-tag">
              // REVENUE &amp; HARDWARE ESCROW • LEDGER ID: ACV-NL-88942
            </span>
            <h1 className="wallet-headline">My Wallet</h1>
            <p className="wallet-subtitle">
              Manage your Corvun builder balance, instant hardware escrow, and transaction ledger.
            </p>
          </div>

          <div className="wallet-header-right-badges">
            <span className="escrow-secure-badge">
              <span className="status-dot green-pulse" />
              <span>Escrow Status: 100% SECURE</span>
            </span>
            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className="wallet-add-funds-btn"
            >
              <PlusIcon />
              <span>Add Funds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Workstation Layout */}
      <div className="wallet-workspace-grid">
        {/* Left Column: Shared Single Source Sidebar */}
        <AccountSidebar activeItem="wallet" />

        {/* Right Column: Wallet Dashboard & Ledger */}
        <main className="wallet-main-content">
          {/* Card 1: Balance Hero Overview */}
          <section className="wallet-card wallet-hero-card">
            <div className="wallet-hero-header">
              <div className="wallet-hero-left">
                <span className="wallet-balance-tag">AVAILABLE STORE BALANCE</span>
                <div className="wallet-balance-display">
                  <span className="wallet-balance-currency">₹</span>
                  <span className="wallet-balance-big">
                    {Number(walletState.balance || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="wallet-status-badge">
                    <span className="status-dot green-pulse" />
                    <span>ACTIVE</span>
                  </span>
                </div>
              </div>

              <div className="wallet-hero-actions">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(true)}
                  className="hero-topup-btn"
                >
                  <PlusIcon />
                  <span>+ Add Funds</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Escrow withdrawal protocol: Active funds can be used at checkout or refunded to original payment source upon request.", "info")}
                  className="hero-withdraw-btn"
                >
                  <span>Withdraw</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Sub-Row */}
            <div className="wallet-kpi-subrow">
              <div className="kpi-pill-item">
                <span className="kpi-pill-icon">🪙</span>
                <div className="kpi-pill-info">
                  <span className="kpi-pill-label">Cashback Pending</span>
                  <span className="kpi-pill-value">
                    {formatCurrency(walletState.pendingCashback || 350)}
                  </span>
                </div>
              </div>

              <div className="kpi-pill-sep" />

              <div className="kpi-pill-item">
                <span className="kpi-pill-icon">🏷️</span>
                <div className="kpi-pill-info">
                  <span className="kpi-pill-label">Reward Points</span>
                  <span className="kpi-pill-value">
                    {walletState.rewardPoints || 120} Points
                  </span>
                </div>
              </div>

              <div className="kpi-pill-sep" />

              <div className="kpi-pill-item">
                <span className="kpi-pill-icon">⚡</span>
                <div className="kpi-pill-info">
                  <span className="kpi-pill-label">Checkout Speed</span>
                  <span className="kpi-pill-value green-text">1-Click Instant</span>
                </div>
              </div>
            </div>

            {/* Quick Add Presets Bar */}
            <div className="wallet-presets-strip">
              <span className="presets-label">Quick Top-Up Presets:</span>
              <div className="presets-button-group">
                {[500, 1000, 2500, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTopUpAmount(String(preset));
                      setIsTopUpOpen(true);
                    }}
                    className="preset-chip"
                  >
                    + ₹{preset.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Card 2: Security & Zero-Fee Guarantee Banner */}
          <div className="wallet-guarantee-banner">
            <div className="guarantee-icon-wrapper">
              <CheckShieldIcon />
            </div>
            <div className="guarantee-text">
              <h4 className="guarantee-title">Corvun Zero-Fee Hardware Assurance</h4>
              <p className="guarantee-desc">
                100% of top-up amount is directly credited to your store balance without hidden payment gateway cuts or processing surcharges. Usable for custom rigs, GPUs, and peripherals.
              </p>
            </div>
          </div>

          {/* Card 3: Passbook / Transaction Ledger */}
          <section className="wallet-card wallet-ledger-card">
            <div className="ledger-card-header">
              <div className="ledger-title-group">
                <h2 className="ledger-title">Transaction Ledger &amp; Passbook</h2>
                <span className="ledger-counter">
                  {filteredTransactions.length} RECORD{filteredTransactions.length === 1 ? "" : "S"}
                </span>
              </div>

              {/* Controls: Search & Sort */}
              <div className="ledger-controls">
                <div className="ledger-search-box">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search by ID, note, or ref..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ledger-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="search-clear-btn"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="ledger-sort-select"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs Bar */}
            <div className="ledger-tabs-bar">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`ledger-tab ${typeFilter === "all" ? "active" : ""}`}
              >
                All Entries
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("credit")}
                className={`ledger-tab ${typeFilter === "credit" ? "active" : ""}`}
              >
                Credits &amp; Top-Ups
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("debit")}
                className={`ledger-tab ${typeFilter === "debit" ? "active" : ""}`}
              >
                Debits &amp; Orders
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("referral")}
                className={`ledger-tab ${typeFilter === "referral" ? "active" : ""}`}
              >
                Referral Bonuses
              </button>
            </div>

            {/* Transactions List */}
            {loading ? (
              <div className="ledger-loading-box">
                <div className="corvun-spinner" />
                <p className="ledger-loading-text">INTERROGATING WORKSTATION PASSBOOK...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="ledger-empty-state">
                <div className="empty-state-icon">
                  <WalletIcon />
                </div>
                <h3 className="empty-state-title">No Ledger Records Found</h3>
                <p className="empty-state-desc">
                  {searchQuery || typeFilter !== "all"
                    ? "No transactions match your active query parameters. Try resetting your search or filter."
                    : "No transactions have been recorded in this workstation wallet yet."}
                </p>
                <div className="empty-state-actions">
                  {(searchQuery || typeFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setTypeFilter("all");
                      }}
                      className="empty-reset-btn"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTopUpOpen(true)}
                    className="empty-topup-btn"
                  >
                    + Add Initial Funds
                  </button>
                </div>
              </div>
            ) : (
              <div className="ledger-items-list">
                {filteredTransactions.map((txn) => {
                  const isCredit = txn.type === "credit";
                  return (
                    <div key={txn.id} className="ledger-item-row">
                      {/* Left: Direction Icon */}
                      <div className={`txn-direction-indicator ${isCredit ? "credit" : "debit"}`}>
                        {isCredit ? <ArrowDownLeft /> : <ArrowUpRight />}
                      </div>

                      {/* Middle: Title, Description, Reference & Date */}
                      <div className="txn-details-col">
                        <div className="txn-title-row">
                          <h4 className="txn-title">{txn.title}</h4>
                          <span className="txn-ref-badge">{txn.id}</span>
                        </div>
                        <p className="txn-description">{txn.description}</p>
                        <div className="txn-meta-line">
                          <span className="txn-date">{formatDate(txn.date)}</span>
                          <span className="meta-bullet">•</span>
                          <span className="txn-method">{txn.paymentMethod || "Electronic Node"}</span>
                          {txn.reference && (
                            <>
                              <span className="meta-bullet">•</span>
                              <span className="txn-custom-ref">Ref: {txn.reference}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Balance Tag */}
                      <div className="txn-amount-col">
                        <div className={`txn-amount-val ${isCredit ? "credit" : "debit"}`}>
                          {isCredit ? "+" : "-"} {formatCurrency(txn.amount)}
                        </div>
                        <div className="txn-balance-after">
                          Balance: {formatCurrency(txn.balanceAfter)}
                        </div>
                        <span className="txn-status-tag">
                          <span className="tiny-check">✓</span> Completed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ledger Telemetry Footer (Screenshot 7) */}
            <div className="ledger-card-footer-strip">
              <span className="ledger-entries-count">
                Showing recent {filteredTransactions.length} of {walletState.transactions?.length || 0} total entries
              </span>
              <span className="ledger-sync-tag">
                <span className="status-dot green-pulse" />
                <span>Ledger synchronized via Corvun API v2.4</span>
              </span>
            </div>
          </section>
        </main>
      </div>

      {/* =====================================================================
          ADD MONEY / TOP-UP MODAL
          ===================================================================== */}
      {isTopUpOpen && (
        <div className="wallet-modal-overlay" onClick={() => !isProcessing && setIsTopUpOpen(false)}>
          <div className="wallet-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <div className="modal-title-group">
                <span className="modal-prefix">// WORKSTATION_TOPUP</span>
                <h3 className="modal-title">Add Funds to Corvun Wallet</h3>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setIsTopUpOpen(false)}
                className="modal-close-btn"
                disabled={isProcessing}
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="wallet-modal-form">
              {/* Amount Input */}
              <div className="modal-form-group">
                <label className="modal-form-label">ENTER TOP-UP AMOUNT (INR)</label>
                <div className="modal-input-wrapper">
                  <span className="modal-currency-affix">₹</span>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    step="50"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    required
                    disabled={isProcessing}
                    placeholder="Enter amount (min ₹100)"
                    className="modal-amount-input"
                  />
                </div>
                <span className="modal-hint-text">
                  Min ₹100.00 • Max ₹1,00,000.00 per transaction
                </span>
              </div>

              {/* Quick Select Chips */}
              <div className="modal-preset-chips">
                {[500, 1000, 2000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetSelect(amt)}
                    disabled={isProcessing}
                    className={`modal-preset-btn ${topUpAmount === String(amt) ? "active" : ""}`}
                  >
                    ₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {/* Payment Gateway Option */}
              <div className="modal-form-group">
                <label className="modal-form-label">SELECT PAYMENT PROTOCOL</label>
                <div className="modal-gateway-options">
                  <label className={`gateway-option ${paymentMethod === "UPI" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="gateway"
                      value="UPI"
                      checked={paymentMethod === "UPI"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={isProcessing}
                    />
                    <div className="gateway-meta">
                      <span className="gateway-name">UPI (GPay / PhonePe / QR)</span>
                      <span className="gateway-sub">Instant zero-fee settlement</span>
                    </div>
                  </label>

                  <label className={`gateway-option ${paymentMethod === "Cards" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="gateway"
                      value="Cards"
                      checked={paymentMethod === "Cards"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={isProcessing}
                    />
                    <div className="gateway-meta">
                      <span className="gateway-name">Credit / Debit Card</span>
                      <span className="gateway-sub">Visa, MasterCard, RuPay</span>
                    </div>
                  </label>

                  <label className={`gateway-option ${paymentMethod === "NetBanking" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="gateway"
                      value="NetBanking"
                      checked={paymentMethod === "NetBanking"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={isProcessing}
                    />
                    <div className="gateway-meta">
                      <span className="gateway-name">Net Banking</span>
                      <span className="gateway-sub">All major banks supported</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Security Footnote */}
              <div className="modal-security-note">
                <CheckShieldIcon />
                <span>Protected by 256-bit TLS encrypted Corvun payment gateway.</span>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  disabled={isProcessing}
                  className="modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !topUpAmount}
                  className="modal-submit-btn"
                >
                  {isProcessing ? (
                    <span>AUTHORIZING PAYMENT...</span>
                  ) : (
                    <span>CONFIRM &amp; LOAD {formatCurrency(parseFloat(topUpAmount) || 0)}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
