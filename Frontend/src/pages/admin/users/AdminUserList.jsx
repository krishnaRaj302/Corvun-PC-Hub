import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAdminUsers,
  blockAdminUser,
  unblockAdminUser,
} from "../../../services/adminUserService";
import "./AdminUserList.css";

export default function AdminUserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionTarget, setActionTarget] = useState(null); // { user, action: "block" | "unblock" }
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const PAGE_SIZE = 7; // Matches Figma 7 items per page

  // Dismiss toast after 4s
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers({ search: search.trim() });
      const list = data.users || (Array.isArray(data) ? data : []);
      setUsers(list);
    } catch (err) {
      console.error("AdminUserList:", err);
      setError("Unable to load user accounts. Verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pagination slicing
  const totalCount = users.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage]);

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  // Helper: Initials
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Date format (DD/MM/YYYY)
  const formatJoinDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle Block / Unblock confirm
  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    const { user, action } = actionTarget;
    setProcessing(true);
    try {
      if (action === "block") {
        await blockAdminUser(user.id);
        setToastMessage(`User "${user.full_name}" has been blocked.`);
      } else {
        await unblockAdminUser(user.id);
        setToastMessage(`User "${user.full_name}" has been unblocked.`);
      }
      setActionTarget(null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || `Error performing ${action} action.`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="aul-page">
      {/* Header */}
      <div className="aul-header">
        <h1 className="aul-title">Users</h1>
        <p className="aul-subtitle">Manage your users and their permissions</p>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="aul-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
          <button className="aul-toast-close" onClick={() => setToastMessage("")}>✕</button>
        </div>
      )}

      {/* Filter Bar (Search only per Figma) */}
      <div className="aul-filter-bar">
        <div className="aul-search-wrap">
          <svg className="aul-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="user-search"
            type="text"
            className="aul-search-input"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="aul-card">
        {loading ? (
          <div className="aul-empty">
            <div className="aul-spinner" />
            <span>Loading user accounts...</span>
          </div>
        ) : error ? (
          <div className="aul-empty aul-empty--error">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button className="aul-retry-btn" onClick={fetchUsers}>↺ Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div className="aul-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div className="aul-empty-title">No Users Found</div>
            <div className="aul-empty-desc">
              {search
                ? `No users match "${search}". Try adjusting your query.`
                : "No registered users in the database yet."}
            </div>
          </div>
        ) : (
          <>
            <div className="aul-table-wrap">
              <table className="aul-table">
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th>JOIN DATE</th>
                    <th className="aul-th-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const isAdmin = (u.role || "").toLowerCase() === "admin";
                    const isBlocked = (u.status || "").toLowerCase() === "blocked";
                    const initials = getInitials(u.full_name);

                    return (
                      <tr key={u.id}>
                        {/* ── USER ───────────────────────────────── */}
                        <td>
                          <div className="aul-user-cell">
                            <div className={`aul-avatar ${isAdmin ? "aul-avatar--admin" : ""}`}>
                              {initials}
                            </div>
                            <div className="aul-user-meta">
                              <div
                                className={`aul-user-name ${isBlocked ? "aul-user-name--blocked" : ""}`}
                                title={u.full_name}
                              >
                                {u.full_name || "Unnamed User"}
                              </div>
                              <div className="aul-user-email" title={u.email}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ── ROLE ───────────────────────────────── */}
                        <td>
                          {isAdmin ? (
                            <span className="aul-role-badge">Admin</span>
                          ) : (
                            <span className="aul-role-text">Customer</span>
                          )}
                        </td>

                        {/* ── STATUS ─────────────────────────────── */}
                        <td>
                          {isBlocked ? (
                            <span className="aul-status-pill aul-status-pill--blocked">
                              blocked
                            </span>
                          ) : (
                            <span className="aul-status-pill aul-status-pill--active">
                              active
                            </span>
                          )}
                        </td>

                        {/* ── JOIN DATE ──────────────────────────── */}
                        <td>
                          <span className="aul-date">
                            {formatJoinDate(u.created_at)}
                          </span>
                        </td>

                        {/* ── ACTIONS ────────────────────────────── */}
                        <td>
                          <div className="aul-actions">
                            {isBlocked ? (
                              <button
                                className="aul-action-btn aul-action-btn--unblock"
                                title="Unblock user"
                                onClick={() => setActionTarget({ user: u, action: "unblock" })}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="9 12 11.5 14.5 15.5 9.5" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                className="aul-action-btn aul-action-btn--block"
                                title="Block user"
                                onClick={() => setActionTarget({ user: u, action: "block" })}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="aul-pagination">
              <span className="aul-pagination-info">
                Showing {rangeStart}–{rangeEnd} of {totalCount} users
              </span>
              <div className="aul-pagination-controls">
                <button
                  className="aul-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    className={`aul-page-num ${currentPage === pg ? "active" : ""}`}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  className="aul-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionTarget && (
        <div className="aul-modal-backdrop" onClick={() => setActionTarget(null)}>
          <div className="aul-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aul-modal-header">
              <h2 className="aul-modal-title">
                {actionTarget.action === "block" ? "Block User Account" : "Unblock User Account"}
              </h2>
              <button className="aul-modal-close" onClick={() => setActionTarget(null)}>✕</button>
            </div>
            <div className="aul-modal-body">
              <p className="aul-modal-text">
                {actionTarget.action === "block"
                  ? `Are you sure you want to block ${actionTarget.user.full_name}? The user will be unable to log in or place orders.`
                  : `Are you sure you want to restore access for ${actionTarget.user.full_name}?`}
              </p>
              <div className="aul-modal-user-box">
                <div className="aul-modal-user-name">{actionTarget.user.full_name}</div>
                <div className="aul-modal-user-email">{actionTarget.user.email}</div>
              </div>
            </div>
            <div className="aul-modal-footer">
              <button
                className="aul-modal-cancel"
                disabled={processing}
                onClick={() => setActionTarget(null)}
              >
                Cancel
              </button>
              <button
                className={`aul-modal-confirm ${actionTarget.action === "block" ? "aul-modal-confirm--block" : "aul-modal-confirm--unblock"}`}
                disabled={processing}
                onClick={handleConfirmAction}
              >
                {processing
                  ? "Processing..."
                  : actionTarget.action === "block"
                  ? "Block User"
                  : "Unblock User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
