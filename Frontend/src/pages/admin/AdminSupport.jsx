import { useState, useEffect, useCallback } from "react";
import {
  getAdminTickets,
  getAdminTicketDetail,
  updateAdminTicket,
} from "../../services/adminSupportService";
import "./AdminSupport.css";

/* ─── Helpers ──────────────────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
};

const PAGE_SIZE = 10;

export default function AdminSupport() {
  /* ── State ─────────────────────────────────────────────────── */
  const [tickets, setTickets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [stats, setStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [copiedTicket, setCopiedTicket] = useState(null);

  /* ── Manage / Detail Modal State ───────────────────────────── */
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState("open");
  const [modalPriority, setModalPriority] = useState("medium");
  const [updating, setUpdating] = useState(false);

  /* ── Auto-dismiss toast ────────────────────────────────────── */
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  /* ── Copy Ticket Number ────────────────────────────────────── */
  const handleCopyTicket = (ticketNum) => {
    navigator.clipboard.writeText(ticketNum);
    setCopiedTicket(ticketNum);
    showToast(`Copied ${ticketNum} to clipboard!`, "success");
    setTimeout(() => {
      setCopiedTicket(null);
    }, 2000);
  };

  /* ── Fetch Tickets ─────────────────────────────────────────── */
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        page_size: PAGE_SIZE,
        paginate: true,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter && priorityFilter !== "all") params.priority = priorityFilter;

      const data = await getAdminTickets(params);
      const results = data.tickets || data.results || (Array.isArray(data) ? data : []);
      setTickets(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("AdminSupport fetch error:", err);
      setError("Unable to load support tickets. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  /* ── Search and Filter Handlers ────────────────────────────── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (e) => {
    setPriorityFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCurrentPage(1);
  };

  /* ── Open Manage Modal ─────────────────────────────────────── */
  const handleOpenModal = (ticket) => {
    setSelectedTicket(ticket);
    setModalStatus(ticket.status || "open");
    setModalPriority(ticket.priority || "medium");
    setIsModalOpen(true);
  };

  /* ── Update Ticket Status / Priority ───────────────────────── */
  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setUpdating(true);
    try {
      const res = await updateAdminTicket(selectedTicket.id, {
        status: modalStatus,
        priority: modalPriority,
      });

      showToast(res.message || "Ticket updated successfully!", "success");
      setIsModalOpen(false);
      fetchTickets();
    } catch (err) {
      console.error("Update ticket error:", err);
      const errMsg = err.response?.data?.error || "Failed to update ticket.";
      showToast(errMsg, "error");
    } finally {
      setUpdating(false);
    }
  };

  /* ── Pagination Calculations ───────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalCount);

  /* ── Render Badges ─────────────────────────────────────────── */
  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "open":
        return (
          <span className="sp-badge sp-badge--open">
            <span className="sp-badge-dot" /> Open
          </span>
        );
      case "in_progress":
        return (
          <span className="sp-badge sp-badge--progress">
            <span className="sp-badge-dot" /> In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="sp-badge sp-badge--resolved">
            <span className="sp-badge-dot" /> Resolved
          </span>
        );
      case "closed":
        return (
          <span className="sp-badge sp-badge--closed">
            <span className="sp-badge-dot" /> Closed
          </span>
        );
      default:
        return (
          <span className="sp-badge sp-badge--closed">
            <span className="sp-badge-dot" /> {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority) => {
    const p = (priority || "").toLowerCase();
    switch (p) {
      case "high":
        return (
          <span className="sp-priority-badge sp-priority-badge--high">
            <span className="sp-priority-icon">▲</span> High
          </span>
        );
      case "medium":
        return (
          <span className="sp-priority-badge sp-priority-badge--medium">
            <span className="sp-priority-icon">●</span> Medium
          </span>
        );
      case "low":
        return (
          <span className="sp-priority-badge sp-priority-badge--low">
            <span className="sp-priority-icon">▼</span> Low
          </span>
        );
      default:
        return (
          <span className="sp-priority-badge">
            {priority}
          </span>
        );
    }
  };

  return (
    <div className="sp-page">
      {/* ── Toast Notification ────────────────────────────────── */}
      {toast.show && (
        <div className={`sp-toast sp-toast--${toast.type}`}>
          <div className="sp-toast-content">
            <span className="sp-toast-indicator" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="sp-toast-close"
            onClick={() => setToast({ show: false, message: "", type: "success" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="sp-header">
        <div className="sp-header-left">
          <h1 className="sp-title">Support Management</h1>
          <p className="sp-subtitle">
            Manage incoming customer support tickets, issues, and inquiries.
          </p>
        </div>
        <div className="sp-header-right">
          <button
            type="button"
            className="sp-btn-secondary"
            onClick={fetchTickets}
            title="Refresh tickets"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────── */}
      <div className="sp-stats-grid">
        <div className="sp-stat-card">
          <div className="sp-stat-body">
            <span className="sp-stat-label">Total Tickets</span>
            <span className="sp-stat-value">{stats.total_tickets}</span>
          </div>
          <div className="sp-stat-icon sp-stat-icon--default">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-body">
            <span className="sp-stat-label">Open Tickets</span>
            <span className="sp-stat-value sp-stat-value--warning">{stats.open_tickets}</span>
          </div>
          <div className="sp-stat-icon sp-stat-icon--warning">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-body">
            <span className="sp-stat-label">In Progress</span>
            <span className="sp-stat-value sp-stat-value--info">{stats.in_progress_tickets}</span>
          </div>
          <div className="sp-stat-icon sp-stat-icon--info">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </div>
        </div>

        <div className="sp-stat-card">
          <div className="sp-stat-body">
            <span className="sp-stat-label">Resolved / Closed</span>
            <span className="sp-stat-value sp-stat-value--success">{stats.resolved_tickets}</span>
          </div>
          <div className="sp-stat-icon sp-stat-icon--success">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────── */}
      {error && (
        <div className="sp-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="sp-btn-secondary" onClick={fetchTickets}>
            Retry
          </button>
        </div>
      )}

      {/* ── Search & Filter Controls ──────────────────────────── */}
      <div className="sp-controls">
        <div className="sp-search-box">
          <svg className="sp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sp-search-input"
            placeholder="Search ticket #, subject, or customer..."
            value={search}
            onChange={handleSearchChange}
            id="sp-search-input"
          />
          {search && (
            <button
              type="button"
              className="sp-search-clear"
              onClick={() => { setSearch(""); setCurrentPage(1); }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="sp-filter-group">
          <select
            className="sp-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            id="sp-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            className="sp-select"
            value={priorityFilter}
            onChange={handlePriorityFilterChange}
            id="sp-priority-filter"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {(search || statusFilter !== "all" || priorityFilter !== "all") && (
            <button
              type="button"
              className="sp-btn-secondary"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Tickets Table Card ────────────────────────────────── */}
      <div className="sp-table-card">
        {loading ? (
          <div className="sp-loading-container">
            <div className="sp-spinner" />
            <span>Loading support tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="sp-empty-state">
            <div className="sp-empty-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="sp-empty-title">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "No matching tickets found"
                : "No support tickets found"}
            </h3>
            <p className="sp-empty-desc">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search criteria or resetting filters."
                : "Customer support tickets will appear here once submitted."}
            </p>
            {(search || statusFilter !== "all" || priorityFilter !== "all") && (
              <button
                type="button"
                className="sp-btn-secondary"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="sp-table-responsive">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>TICKET #</th>
                  <th>CUSTOMER</th>
                  <th>SUBJECT</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>CREATED DATE</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="sp-table-row">
                    <td>
                      <div className="sp-ticket-num-wrapper">
                        <span className="sp-ticket-num">{ticket.ticket_number}</span>
                        <button
                          type="button"
                          className="sp-copy-btn"
                          title="Copy ticket number"
                          onClick={() => handleCopyTicket(ticket.ticket_number)}
                        >
                          {copiedTicket === ticket.ticket_number ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="sp-customer-info">
                        <span className="sp-customer-name">
                          {ticket.customer_name || "—"}
                        </span>
                        <span className="sp-customer-email">
                          {ticket.customer_email || "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="sp-subject-text" title={ticket.subject}>
                        {ticket.subject}
                      </span>
                    </td>
                    <td>{renderPriorityBadge(ticket.priority)}</td>
                    <td>{renderStatusBadge(ticket.status)}</td>
                    <td>
                      <span className="sp-date-text">
                        {formatDate(ticket.created_at)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="sp-action-btn"
                        onClick={() => handleOpenModal(ticket)}
                        title="Manage Ticket"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ───────────────────────────────── */}
        {!loading && tickets.length > 0 && (
          <div className="sp-pagination">
            <span className="sp-pagination-info">
              Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> of{" "}
              <strong>{totalCount}</strong> tickets
            </span>

            <div className="sp-pagination-controls">
              <button
                type="button"
                className="sp-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹ Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                if (
                  totalPages <= 7 ||
                  pg === 1 ||
                  pg === totalPages ||
                  (pg >= currentPage - 1 && pg <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      className={`sp-page-number ${currentPage === pg ? "sp-page-number--active" : ""}`}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  );
                }
                if (pg === 2 || pg === totalPages - 1) {
                  return (
                    <span key={pg} className="sp-page-ellipsis">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                type="button"
                className="sp-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Manage / Triage Ticket Modal ──────────────────────── */}
      {isModalOpen && selectedTicket && (
        <div className="sp-modal-backdrop" onClick={() => !updating && setIsModalOpen(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <div className="sp-modal-header-info">
                <span className="sp-modal-ticket-id">{selectedTicket.ticket_number}</span>
                <h2 className="sp-modal-title">{selectedTicket.subject}</h2>
              </div>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => !updating && setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTicket} className="sp-modal-body">
              {/* Customer Details Box */}
              <div className="sp-customer-card">
                <h4 className="sp-section-heading">CUSTOMER INFORMATION</h4>
                <div className="sp-customer-grid">
                  <div className="sp-customer-field">
                    <span className="sp-field-label">Customer Name</span>
                    <span className="sp-field-value">{selectedTicket.customer_name || "—"}</span>
                  </div>
                  <div className="sp-customer-field">
                    <span className="sp-field-label">Email Address</span>
                    <span className="sp-field-value">{selectedTicket.customer_email || "—"}</span>
                  </div>
                  {selectedTicket.customer_phone && (
                    <div className="sp-customer-field">
                      <span className="sp-field-label">Phone</span>
                      <span className="sp-field-value">{selectedTicket.customer_phone}</span>
                    </div>
                  )}
                  <div className="sp-customer-field">
                    <span className="sp-field-label">Submitted On</span>
                    <span className="sp-field-value">{formatDate(selectedTicket.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Triage / Update Controls */}
              <div className="sp-triage-controls">
                <h4 className="sp-section-heading">TRIAGE & RESOLUTION</h4>
                <div className="sp-form-row">
                  <div className="sp-form-group">
                    <label className="sp-form-label">Ticket Status</label>
                    <select
                      className="sp-select sp-select--full"
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">Priority Level</label>
                    <select
                      className="sp-select sp-select--full"
                      value={modalPriority}
                      onChange={(e) => setModalPriority(e.target.value)}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sp-modal-actions">
                <button
                  type="button"
                  className="sp-btn-secondary"
                  disabled={updating}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sp-btn-primary"
                  disabled={updating}
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
