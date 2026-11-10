import { useState, useEffect, useCallback } from "react";
import { getAdminReferrals } from "../../services/adminReferralService";
import "./AdminReferrals.css";

/* ─── Currency & Date Formatters ────────────────────────────── */
const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return d;
  }
};

export default function AdminReferrals() {
  /* ── State ─────────────────────────────────────────────────── */
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    total_referrals: 0,
    successful_conversions: 0,
    total_earnings: 0,
    pending_rewards: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Fetch Referrals from PostgreSQL API ─────────────────────── */
  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminReferrals();
      const results = data.referrals || data.results || (Array.isArray(data) ? data : []);
      setReferrals(results);

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("AdminReferrals fetch error:", err);
      setError("Unable to load referral records. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  /* ── Status Pill Generator ─────────────────────────────────── */
  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "completed":
        return <span className="rf-badge rf-badge--completed">Completed</span>;
      case "pending":
        return <span className="rf-badge rf-badge--pending">Pending</span>;
      case "expired":
        return <span className="rf-badge rf-badge--expired">Expired</span>;
      default:
        return <span className="rf-badge rf-badge--pending">{status || "Pending"}</span>;
    }
  };

  return (
    <div className="rf-page">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="rf-header">
        <h1 className="rf-title">Referral Program</h1>
        <p className="rf-subtitle">Track and manage your referral rewards</p>
      </div>

      {/* ── Error Banner ──────────────────────────────────────── */}
      {error && (
        <div className="rf-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="rf-btn-retry" onClick={fetchReferrals}>
            Retry
          </button>
        </div>
      )}

      {/* ── 4 KPI Cards (Exact Figma layout) ──────────────────── */}
      <div className="rf-stats-grid">
        {/* Card 1: Total Referrals */}
        <div className="rf-stat-card">
          <div className="rf-stat-body">
            <span className="rf-stat-label">Total Referrals</span>
            <span className="rf-stat-value">{stats.total_referrals}</span>
          </div>
          <div className="rf-stat-icon rf-stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        {/* Card 2: Successful Conversions */}
        <div className="rf-stat-card">
          <div className="rf-stat-body">
            <span className="rf-stat-label">Successful Conversions</span>
            <span className="rf-stat-value">{stats.successful_conversions}</span>
          </div>
          <div className="rf-stat-icon rf-stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>

        {/* Card 3: Total Earnings */}
        <div className="rf-stat-card">
          <div className="rf-stat-body">
            <span className="rf-stat-label">Total Earnings</span>
            <span className="rf-stat-value">{formatCurrency(stats.total_earnings)}</span>
          </div>
          <div className="rf-stat-icon rf-stat-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        {/* Card 4: Pending Rewards */}
        <div className="rf-stat-card">
          <div className="rf-stat-body">
            <span className="rf-stat-label">Pending Rewards</span>
            <span className="rf-stat-value">{formatCurrency(stats.pending_rewards)}</span>
          </div>
          <div className="rf-stat-icon rf-stat-icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Referral History Section ──────────────────────────── */}
      <div className="rf-history-section">
        <h2 className="rf-section-title">Referral History</h2>

        <div className="rf-table-card">
          {loading ? (
            <div className="rf-loading-container">
              <div className="rf-spinner" />
              <span>Loading referrals...</span>
            </div>
          ) : referrals.length === 0 ? (
            <div className="rf-empty-state">
              <div className="rf-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857" />
                  <path d="M9 20H4v-2a3 3 0 0 1 5.356-1.857" />
                  <circle cx="13" cy="7" r="4" />
                  <circle cx="4" cy="11" r="3" />
                  <circle cx="20" cy="11" r="3" />
                </svg>
              </div>
              <h3 className="rf-empty-title">No referrals found</h3>
              <p className="rf-empty-desc">
                When customers use referral links and invite friends, referral records will appear here.
              </p>
            </div>
          ) : (
            <div className="rf-table-responsive">
              <table className="rf-table">
                <thead>
                  <tr>
                    <th>REFERRAL ID</th>
                    <th>REFERRER</th>
                    <th>REFEREE</th>
                    <th>STATUS</th>
                    <th>REWARD AMOUNT</th>
                    <th>ORDER VALUE</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => {
                    const idDisplay = referral.referral_id_display || `REF-${String(referral.id).padStart(3, "0")}`;
                    const orderValue = referral.order_value !== null && referral.order_value !== undefined
                      ? formatCurrency(referral.order_value)
                      : "-";

                    return (
                      <tr key={referral.id} className="rf-table-row">
                        {/* REFERRAL ID */}
                        <td>
                          <span className="rf-id-text">{idDisplay}</span>
                        </td>

                        {/* REFERRER */}
                        <td>
                          <div className="rf-user-cell">
                            <span className="rf-user-name">{referral.referrer_name || "—"}</span>
                            <span className="rf-user-email">{referral.referrer_email || "—"}</span>
                          </div>
                        </td>

                        {/* REFEREE */}
                        <td>
                          <div className="rf-user-cell">
                            <span className="rf-user-name">{referral.referee_name || "—"}</span>
                            <span className="rf-user-email">{referral.referee_email || "—"}</span>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td>{renderStatusBadge(referral.status)}</td>

                        {/* REWARD AMOUNT */}
                        <td>
                          <span className="rf-reward-text">
                            {formatCurrency(referral.reward_amount || 0)}
                          </span>
                        </td>

                        {/* ORDER VALUE */}
                        <td>
                          <span className="rf-order-value-text">{orderValue}</span>
                        </td>

                        {/* DATE */}
                        <td>
                          <span className="rf-date-text">
                            {referral.date || formatDate(referral.created_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
