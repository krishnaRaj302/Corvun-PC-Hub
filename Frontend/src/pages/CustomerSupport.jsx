import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccountSidebar from "../components/AccountSidebar";
import { getMyTickets, createTicket } from "../services/supportService";
import "./CustomerSupport.css";

// SVG Icons
const SupportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ShieldCheckIcon = () => (
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

const ChevronDownIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CATEGORIES = [
  "Hardware Issue",
  "Order Delivery",
  "Payment Inquiry",
  "Product Information",
  "Warranty & RMA",
  "Other",
];

const FAQS = [
  {
    q: "What is your hardware return & replacement policy?",
    a: "We provide a 30-day no-hassle return window on all sealed components and factory-built rigs. If a component is deemed dead-on-arrival or unstable during benchmark burns, Corvun dispatches an immediate advance replacement unit with expedited overnight freight before receiving the returned hardware.",
  },
  {
    q: "How does the 3-Year Comprehensive Rig Warranty work?",
    a: "Every custom rig assembled by Corvun includes full hardware parts coverage, labor, liquid loop leak assurance, and component repair for 36 months from dispatch date.",
  },
  {
    q: "Can I test benchmarks or customize specs before ordering?",
    a: "Yes. Our lab runs synthetic stress runs (FurMark, Cinebench R23, 3DMark Time Spy Extreme) and saves thermal logs for every client build prior to final courier handover.",
  },
  {
    q: "How do I track my custom PC build assembly and testing?",
    a: "Check your My Orders section or enter your Order ID into the live tracking timeline to monitor queued parts, diagnostic bench testing, and courier handoff.",
  },
];

export default function CustomerSupport() {
  const { isAuthenticated, authLoading } = useAuth();

  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "open" | "in_progress" | "resolved"
  const [searchQuery, setSearchQuery] = useState("");

  // Create Ticket Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "Hardware Issue",
    priority: "medium",
    description: "",
    orderReference: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Selected Ticket Detail Modal
  const [selectedTicket, setSelectedTicket] = useState(null);

  // FAQ Accordion Toggle
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ text: msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch Tickets from real backend
  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMyTickets();
      const list = Array.isArray(res?.tickets) ? res.tickets : [];
      setTickets(list);
    } catch (err) {
      console.error("Support tickets fetch error:", err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Unable to interrogate support dispatch matrix."
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      Promise.resolve().then(() => {
        if (isMounted) fetchTickets();
      });
    } else if (!authLoading) {
      Promise.resolve().then(() => {
        if (isMounted) setLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading, fetchTickets]);

  // Ticket KPI Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => (t.status || "").toLowerCase() === "open").length;
    const inProgress = tickets.filter(
      (t) => ["in_progress", "processing", "pending"].includes((t.status || "").toLowerCase())
    ).length;
    const resolved = tickets.filter(
      (t) => ["resolved", "closed", "completed"].includes((t.status || "").toLowerCase())
    ).length;
    return { total, open, inProgress, resolved };
  }, [tickets]);

  // Filtered & Searched Tickets
  const filteredTickets = useMemo(() => {
    let list = [...tickets];

    if (statusFilter !== "all") {
      list = list.filter((t) => {
        const s = (t.status || "").toLowerCase();
        if (statusFilter === "open") return s === "open";
        if (statusFilter === "in_progress") return ["in_progress", "processing", "pending"].includes(s);
        if (statusFilter === "resolved") return ["resolved", "closed", "completed"].includes(s);
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.ticket_number || "").toLowerCase().includes(q) ||
          (t.subject || "").toLowerCase().includes(q) ||
          (t.priority || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [tickets, statusFilter, searchQuery]);

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Ticket to Backend
  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      showToast("Subject is required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      let finalSubject = formData.subject.trim();
      if (formData.orderReference.trim()) {
        finalSubject += ` (Ref: ${formData.orderReference.trim()})`;
      }

      const res = await createTicket({
        subject: finalSubject,
        category: formData.category,
        priority: formData.priority,
      });

      showToast(res.message || "Support ticket dispatched successfully.");
      setIsModalOpen(false);
      setFormData({
        subject: "",
        category: "Hardware Issue",
        priority: "medium",
        description: "",
        orderReference: "",
      });
      fetchTickets();
    } catch (err) {
      console.error("Create ticket error:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to create support ticket. Please verify inputs.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper date formatter
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
      <div className="support-page-wrapper">
        <div className="support-unauth-card">
          <div className="unauth-icon-box">
            <SupportIcon />
          </div>
          <span className="unauth-code">// ENCRYPTED_SUPPORT_CHANNEL</span>
          <h2 className="unauth-title">Authentication Required</h2>
          <p className="unauth-desc">
            Please log in with your verified Corvun terminal profile to view your active support tickets, hardware RMA diagnostics, and communicate with system architects.
          </p>
          <Link to="/login" className="unauth-login-btn">
            ACCESS TERMINAL →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="support-page-wrapper">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`support-toast-banner ${toast.type}`} role="alert">
          <span className="toast-dot" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Breadcrumb & Page Header (Master Reference from CustomerProfile) */}
      <div className="support-header-container">
        <nav className="support-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/profile" className="breadcrumb-link">My Account</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Customer Support</span>
        </nav>

        <div className="support-title-row">
          <div>
            <span className="support-prefix-tag">
              TACTICAL SUPPORT DESK // RESPONSE ACTIVE
            </span>
            <h1 className="support-headline">Customer Support</h1>
            <p className="support-subtitle">
              Submit diagnostic tickets, track hardware inquiries, and review engineering resolutions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="support-create-btn"
          >
            <PlusIcon />
            <span>Create Support Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Workstation Layout */}
      <div className="support-workspace-grid">
        {/* Left Column: Shared Single Source Sidebar */}
        <AccountSidebar activeItem="support" />

        {/* Right Column: Support Desk & Tickets */}
        <main className="support-main-content">
          {/* Quick Concierge Channels Row (Exact reference from Screenshot 10) */}
          <div className="support-channels-grid">
            <div className="channel-card">
              <div className="channel-icon-box">
                <PhoneIcon />
              </div>
              <div className="channel-info">
                <span className="channel-label">Direct Hardware Hotline</span>
                <span className="channel-value">+1 (800) 555-CORVUN</span>
                <span className="channel-sub">Mon–Sat: 8 AM – 8 PM EST</span>
              </div>
            </div>

            <div className="channel-card">
              <div className="channel-icon-box">
                <MailIcon />
              </div>
              <div className="channel-info">
                <span className="channel-label">Technical Support</span>
                <span className="channel-value">support@corvun.com</span>
                <span className="channel-sub">Response within 2 hours</span>
              </div>
            </div>

            <div className="channel-card">
              <div className="channel-icon-box">
                <ShieldCheckIcon />
              </div>
              <div className="channel-info">
                <span className="channel-label">24/7 Live Concierge</span>
                <span className="channel-value green-text">Available 24/7 / 365</span>
                <span className="channel-sub">Instant hardware triage</span>
              </div>
            </div>
          </div>

          {/* Ticket Statistics KPI Cards */}
          <div className="support-kpi-grid">
            <div className="support-kpi-card">
              <span className="kpi-label">TOTAL TICKETS</span>
              <span className="kpi-number">{stats.total}</span>
              <span className="kpi-sub">Indexed in manifest</span>
            </div>

            <div className="support-kpi-card">
              <span className="kpi-label yellow-text">OPEN TICKETS</span>
              <span className="kpi-number yellow-text">{stats.open}</span>
              <span className="kpi-sub">Queued for triage</span>
            </div>

            <div className="support-kpi-card">
              <span className="kpi-label blue-text">IN PROGRESS</span>
              <span className="kpi-number blue-text">{stats.inProgress}</span>
              <span className="kpi-sub">Diagnostics underway</span>
            </div>

            <div className="support-kpi-card">
              <span className="kpi-label green-text">RESOLVED</span>
              <span className="kpi-number green-text">{stats.resolved}</span>
              <span className="kpi-sub">Solution dispatched</span>
            </div>
          </div>

          {/* Tickets Ledger / My Tickets Section */}
          <section className="support-tickets-card">
            <div className="tickets-card-header">
              <div className="tickets-title-group">
                <h2 className="tickets-title">My Support Tickets</h2>
                <span className="tickets-counter">{filteredTickets.length} ACTIVE</span>
              </div>

              {/* Controls: Search and Filter Tabs */}
              <div className="tickets-controls-row">
                <div className="tickets-search-box">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search ticket # or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="tickets-search-input"
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

                <div className="tickets-filter-tabs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`ticket-tab ${statusFilter === "all" ? "active" : ""}`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("open")}
                    className={`ticket-tab ${statusFilter === "open" ? "active" : ""}`}
                  >
                    Open ({stats.open})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("in_progress")}
                    className={`ticket-tab ${statusFilter === "in_progress" ? "active" : ""}`}
                  >
                    In Progress ({stats.inProgress})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("resolved")}
                    className={`ticket-tab ${statusFilter === "resolved" ? "active" : ""}`}
                  >
                    Resolved ({stats.resolved})
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="support-error-banner">
                <span>{error}</span>
              </div>
            )}

            {/* Ticket List View */}
            {loading ? (
              <div className="tickets-loading-box">
                <div className="corvun-spinner" />
                <p className="loading-text">INTERROGATING SUPPORT DISPATCH LEDGER...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="tickets-empty-card">
                <div className="empty-icon-box">
                  <SupportIcon />
                </div>
                <h3 className="empty-title">No Support Tickets Found</h3>
                <p className="empty-desc">
                  {searchQuery || statusFilter !== "all"
                    ? "No tickets match your filter criteria."
                    : "You do not have any open support requests at this time. Create a ticket if you need hardware troubleshooting or order assistance."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="empty-action-btn"
                >
                  <PlusIcon />
                  <span>Create New Ticket</span>
                </button>
              </div>
            ) : (
              <div className="tickets-table-container">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>TICKET ID</th>
                      <th>SUBJECT</th>
                      <th>PRIORITY</th>
                      <th>STATUS</th>
                      <th>CREATED</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => {
                      const priorityLower = (t.priority || "medium").toLowerCase();
                      const statusLower = (t.status || "open").toLowerCase();
                      return (
                        <tr key={t.id || t.ticket_number} className="ticket-row">
                          <td className="ticket-id-cell">
                            <span className="ticket-number-tag">{t.ticket_number || `TKT-${t.id}`}</span>
                          </td>
                          <td className="ticket-subject-cell">
                            <span className="ticket-subject-text">{t.subject}</span>
                          </td>
                          <td className="ticket-priority-cell">
                            <span className={`priority-badge priority-${priorityLower}`}>
                              {priorityLower.toUpperCase()}
                            </span>
                          </td>
                          <td className="ticket-status-cell">
                            <span className={`status-pill status-${statusLower}`}>
                              <span className="status-dot" />
                              <span>{statusLower.toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="ticket-date-cell">
                            <span>{formatDate(t.created_at)}</span>
                          </td>
                          <td className="ticket-action-cell">
                            <button
                              type="button"
                              onClick={() => setSelectedTicket(t)}
                              className="view-ticket-btn"
                            >
                              Inspect Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Knowledge Base & FAQs Accordion (Matching Screenshot 10) */}
          <section className="support-faq-card">
            <div className="faq-header">
              <span className="faq-prefix-tag">// KNOWLEDGE BASE &amp; POLICIES</span>
              <h3 className="faq-title">Frequently Asked Questions</h3>
              <p className="faq-subtitle">
                Direct answers regarding factory assembly, shipping precautions, warranties, and micro-architecture testing.
              </p>
            </div>

            <div className="faq-accordion-list">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="faq-question-btn"
                    >
                      <span className="faq-q-number">0{idx + 1}.</span>
                      <span className="faq-q-text">{faq.q}</span>
                      <span className="faq-toggle-icon">
                        <ChevronDownIcon />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="faq-answer-panel">
                        <p className="faq-a-text">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {/* =====================================================================
          CREATE SUPPORT TICKET MODAL
          ===================================================================== */}
      {isModalOpen && (
        <div className="support-modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="support-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="support-modal-header">
              <div className="modal-title-group">
                <span className="modal-prefix">// TACTICAL_DISPATCH</span>
                <h3 className="modal-title">Create Support Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsModalOpen(false)}
                className="modal-close-btn"
                disabled={submitting}
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="support-modal-form">
              {/* Category */}
              <div className="form-group">
                <label className="form-label">TICKET CATEGORY *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="form-select"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label className="form-label">PRIORITY LEVEL *</label>
                <div className="priority-radio-row">
                  {["low", "medium", "high"].map((p) => (
                    <label
                      key={p}
                      className={`priority-radio-option ${formData.priority === p ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={formData.priority === p}
                        onChange={handleFormChange}
                        disabled={submitting}
                      />
                      <span>{p.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="form-label">SUBJECT *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="e.g. GPU artifacting under load or shipping delay"
                  required
                  disabled={submitting}
                  className="form-input"
                />
              </div>

              {/* Order Reference */}
              <div className="form-group">
                <label className="form-label">RELATED ORDER NUMBER (OPTIONAL)</label>
                <input
                  type="text"
                  name="orderReference"
                  value={formData.orderReference}
                  onChange={handleFormChange}
                  placeholder="e.g. CRV-89421"
                  disabled={submitting}
                  className="form-input"
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">MESSAGE / DIAGNOSTIC DETAILS (OPTIONAL)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Describe your hardware inquiry or thermal logs in detail..."
                  disabled={submitting}
                  className="form-textarea"
                />
              </div>

              {/* Modal Actions */}
              <div className="modal-actions-bar">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="modal-submit-btn"
                >
                  {submitting ? "DISPATCHING..." : "SUBMIT TICKET"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TICKET DETAILS MODAL
          ===================================================================== */}
      {selectedTicket && (
        <div className="support-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="support-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="support-modal-header">
              <div className="modal-title-group">
                <span className="modal-prefix">// TICKET_TELEMETRY</span>
                <h3 className="modal-title">
                  {selectedTicket.ticket_number || `Ticket #${selectedTicket.id}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="modal-close-btn"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="ticket-detail-body">
              <div className="detail-meta-row">
                <div className="meta-box">
                  <span className="meta-caption">STATUS</span>
                  <span className={`status-pill status-${(selectedTicket.status || "open").toLowerCase()}`}>
                    {(selectedTicket.status || "OPEN").toUpperCase()}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-caption">PRIORITY</span>
                  <span className={`priority-badge priority-${(selectedTicket.priority || "medium").toLowerCase()}`}>
                    {(selectedTicket.priority || "MEDIUM").toUpperCase()}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-caption">LOGGED AT</span>
                  <span className="meta-val">{formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>

              <div className="detail-subject-box">
                <span className="detail-label">SUBJECT</span>
                <h4 className="detail-subject-title">{selectedTicket.subject}</h4>
              </div>

              <div className="detail-admin-note">
                <span className="detail-label">ENGINEERING CONCIERGE STATUS</span>
                <p className="detail-note-text">
                  {(selectedTicket.status || "").toLowerCase() === "open"
                    ? "Ticket is currently queued in triage. A certified Level 3 hardware architect will interrogate your telemetry within 2 hours."
                    : "Ticket is actively being addressed by our engineering center."}
                </p>
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="modal-submit-btn"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
