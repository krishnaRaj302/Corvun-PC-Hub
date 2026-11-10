import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboardStats } from "../../services/adminDashboardService";
import "./AdminDashboard.css";

// Helper: Format Currency (INR / Corvun Project Currency)
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return "₹" + num.toLocaleString("en-IN", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

// Helper: Smooth Catmull-Rom Spline for Area/Line Chart
function getSmoothPath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminDashboardStats();
      setData(res);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setError("Unable to connect to live telemetry. Verify backend connectivity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Extract metrics safely
  const totalRevenue = data?.total_revenue ?? 0;
  const totalOrders = data?.total_orders ?? 0;
  const activeUsers = data?.active_users ?? 0;
  const conversionRate = data?.conversion_rate ?? 0;
  const salesOverview = data?.sales_overview || [];
  const salesByCategory = data?.sales_by_category || [];
  const recentOrders = data?.recent_orders || [];

  // ── Sales Overview Chart Calculations (Pure SVG) ──────────────────────
  const chartWidth = 560;
  const chartHeight = 220;
  const chartPaddingTop = 20;
  const chartPaddingBottom = 35;
  const chartPaddingLeft = 45;
  const chartPaddingRight = 25;

  const innerWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
  const innerHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

  const maxRevenue = useMemo(() => {
    if (!salesOverview.length) return 1000;
    const max = Math.max(...salesOverview.map((s) => Number(s.revenue) || 0));
    return max > 0 ? max * 1.15 : 1000;
  }, [salesOverview]);

  const overviewPoints = useMemo(() => {
    if (!salesOverview.length) return [];
    return salesOverview.map((item, idx) => {
      const x =
        chartPaddingLeft +
        (salesOverview.length > 1
          ? (idx / (salesOverview.length - 1)) * innerWidth
          : innerWidth / 2);
      const rev = Number(item.revenue) || 0;
      const y =
        chartPaddingTop + innerHeight - (rev / maxRevenue) * innerHeight;
      return { x, y, month: item.month, revenue: rev, year: item.year };
    });
  }, [salesOverview, innerWidth, innerHeight, maxRevenue]);

  const splinePath = useMemo(() => getSmoothPath(overviewPoints), [overviewPoints]);

  const areaPath = useMemo(() => {
    if (!overviewPoints.length) return "";
    const firstX = overviewPoints[0].x;
    const lastX = overviewPoints[overviewPoints.length - 1].x;
    const baselineY = chartPaddingTop + innerHeight;
    return `${splinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [splinePath, overviewPoints, innerHeight]);

  // Y-Axis Ticks for Sales Overview
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = maxRevenue / 4;
    for (let i = 4; i >= 0; i--) {
      const val = Math.round(step * i);
      const y = chartPaddingTop + innerHeight - (val / maxRevenue) * innerHeight;
      ticks.push({ val, y });
    }
    return ticks;
  }, [maxRevenue, innerHeight]);

  // ── Sales by Category Chart Calculations (Pure SVG/CSS) ───────────────
  const maxCategorySales = useMemo(() => {
    if (!salesByCategory.length) return 1000;
    const max = Math.max(...salesByCategory.map((c) => Number(c.sales) || 0));
    return max > 0 ? max * 1.15 : 1000;
  }, [salesByCategory]);

  const categoryYTicks = useMemo(() => {
    const ticks = [];
    const step = maxCategorySales / 4;
    for (let i = 4; i >= 0; i--) {
      const val = Math.round(step * i);
      const y = chartPaddingTop + innerHeight - (val / maxCategorySales) * innerHeight;
      ticks.push({ val, y });
    }
    return ticks;
  }, [maxCategorySales, innerHeight]);

  // Render Status Badge
  const renderStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "completed" || s === "delivered") {
      return <span className="adb-status-pill adb-status-pill--completed">Completed</span>;
    }
    if (s === "processing" || s === "confirmed") {
      return <span className="adb-status-pill adb-status-pill--processing">Processing</span>;
    }
    if (s === "shipped") {
      return <span className="adb-status-pill adb-status-pill--shipped">Shipped</span>;
    }
    if (s === "cancelled") {
      return <span className="adb-status-pill adb-status-pill--cancelled">Cancelled</span>;
    }
    return <span className="adb-status-pill adb-status-pill--pending">Pending</span>;
  };

  return (
    <div className="admin-dashboard-page">
      {/* ── Dashboard Header ────────────────────────────────────────────── */}
      <div className="adb-header">
        <h1 className="adb-title">Dashboard</h1>
        <p className="adb-subtitle">Welcome back! Here is your store overview</p>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="adb-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button className="adb-retry-btn" onClick={fetchDashboard}>
            ↺ Retry
          </button>
        </div>
      )}

      {/* ── Top KPI Cards Grid ──────────────────────────────────────────── */}
      <div className="adb-kpi-grid">
        {/* KPI 1: Total Revenue */}
        <div className="adb-kpi-card">
          <div className="adb-kpi-header">
            <span className="adb-kpi-label">Total Revenue</span>
            <div className="adb-kpi-icon-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="adb-kpi-value">
            {loading ? <div className="adb-skeleton adb-sk-text" /> : formatCurrency(totalRevenue)}
          </div>
          <div className="adb-kpi-footer">
            <span className="adb-trend adb-trend--up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              <span>+ 0%</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="adb-kpi-card">
          <div className="adb-kpi-header">
            <span className="adb-kpi-label">Total Orders</span>
            <div className="adb-kpi-icon-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
          </div>
          <div className="adb-kpi-value">
            {loading ? <div className="adb-skeleton adb-sk-text" /> : totalOrders.toLocaleString()}
          </div>
          <div className="adb-kpi-footer">
            <span className="adb-trend adb-trend--up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              <span>+ 0%</span>
            </span>
          </div>
        </div>

        {/* KPI 3: Active Users */}
        <div className="adb-kpi-card">
          <div className="adb-kpi-header">
            <span className="adb-kpi-label">Active Users</span>
            <div className="adb-kpi-icon-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="adb-kpi-value">
            {loading ? <div className="adb-skeleton adb-sk-text" /> : activeUsers.toLocaleString()}
          </div>
          <div className="adb-kpi-footer">
            <span className="adb-trend adb-trend--up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              <span>+ 0%</span>
            </span>
          </div>
        </div>

        {/* KPI 4: Conversion Rate */}
        <div className="adb-kpi-card">
          <div className="adb-kpi-header">
            <span className="adb-kpi-label">Conversion Rate</span>
            <div className="adb-kpi-icon-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
          </div>
          <div className="adb-kpi-value">
            {loading ? <div className="adb-skeleton adb-sk-text" /> : `${conversionRate}%`}
          </div>
          <div className="adb-kpi-footer">
            <span className="adb-trend adb-trend--down">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              <span>0%</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Middle Section: Two Charts Side-by-Side ──────────────────────── */}
      <div className="adb-charts-grid">
        {/* Chart 1: Sales Overview (Area / Curve) */}
        <div className="adb-chart-card">
          <div className="adb-chart-header">
            <h2 className="adb-chart-title">Sales Overview</h2>
          </div>

          <div className="adb-chart-body">
            {loading ? (
              <div className="adb-chart-skeleton" />
            ) : (
              <div className="adb-svg-wrap">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="adb-svg-chart"
                >
                  <defs>
                    <linearGradient id="adbRedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef3842" stopOpacity="0.35" />
                      <stop offset="70%" stopColor="#ef3842" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#ef3842" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Y-Axis Grid Lines & Labels */}
                  {yTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={chartPaddingLeft}
                        y1={tick.y}
                        x2={chartWidth - chartPaddingRight}
                        y2={tick.y}
                        stroke="#161922"
                        strokeDasharray={i === 4 ? "none" : "2,3"}
                      />
                      <text
                        x={chartPaddingLeft - 8}
                        y={tick.y + 4}
                        className="adb-axis-label adb-axis-label--y"
                      >
                        {tick.val >= 1000 ? `${Math.round(tick.val / 1000)}k` : tick.val}
                      </text>
                    </g>
                  ))}

                  {/* Area fill under curve */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#adbRedGradient)" />
                  )}

                  {/* Smooth red line */}
                  {splinePath && (
                    <path
                      d={splinePath}
                      fill="none"
                      stroke="#ef3842"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Data Points */}
                  {overviewPoints.map((pt, i) => (
                    <g key={i}>
                      {/* Invisible hit target for smooth hover */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="transparent"
                        className="adb-hit-target"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* Outer glow ring on hover */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPoint?.month === pt.month ? "6" : "3.5"}
                        fill="#ffffff"
                        stroke="#ef3842"
                        strokeWidth={hoveredPoint?.month === pt.month ? "2.5" : "1.5"}
                        style={{ transition: "all 0.15s ease" }}
                      />
                      {/* X-Axis Month Label */}
                      <text
                        x={pt.x}
                        y={chartHeight - 8}
                        className="adb-axis-label adb-axis-label--x"
                      >
                        {pt.month}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Floating Tooltip */}
                {hoveredPoint && (
                  <div
                    className="adb-chart-tooltip"
                    style={{
                      left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                      top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                    }}
                  >
                    <div className="adb-tooltip-title">{hoveredPoint.month} {hoveredPoint.year}</div>
                    <div className="adb-tooltip-val">{formatCurrency(hoveredPoint.revenue)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Sales by Category (Vertical Bars) */}
        <div className="adb-chart-card">
          <div className="adb-chart-header">
            <h2 className="adb-chart-title">Sales by Category</h2>
          </div>

          <div className="adb-chart-body">
            {loading ? (
              <div className="adb-chart-skeleton" />
            ) : (
              <div className="adb-svg-wrap">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="adb-svg-chart"
                >
                  {/* Y-Axis Grid Lines & Labels */}
                  {categoryYTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={chartPaddingLeft}
                        y1={tick.y}
                        x2={chartWidth - chartPaddingRight}
                        y2={tick.y}
                        stroke="#161922"
                        strokeDasharray={i === 4 ? "none" : "2,3"}
                      />
                      <text
                        x={chartPaddingLeft - 8}
                        y={tick.y + 4}
                        className="adb-axis-label adb-axis-label--y"
                      >
                        {tick.val >= 1000 ? `${Math.round(tick.val / 1000)}k` : tick.val}
                      </text>
                    </g>
                  ))}

                  {/* Vertical Bars */}
                  {salesByCategory.map((cat, i) => {
                    const count = salesByCategory.length || 1;
                    const slotWidth = innerWidth / count;
                    const barWidth = Math.min(32, slotWidth * 0.55);
                    const barX =
                      chartPaddingLeft +
                      i * slotWidth +
                      (slotWidth - barWidth) / 2;

                    const sales = Number(cat.sales) || 0;
                    const barHeight =
                      sales > 0 ? (sales / maxCategorySales) * innerHeight : 2;
                    const barY = chartPaddingTop + innerHeight - barHeight;

                    const isHovered = hoveredBar?.category === cat.category;

                    return (
                      <g key={cat.category || i}>
                        {/* Invisible hit box */}
                        <rect
                          x={barX - 8}
                          y={chartPaddingTop}
                          width={barWidth + 16}
                          height={innerHeight + 25}
                          fill="transparent"
                          className="adb-hit-target"
                          onMouseEnter={() =>
                            setHoveredBar({
                              category: cat.category,
                              sales,
                              x: barX + barWidth / 2,
                              y: barY,
                            })
                          }
                          onMouseLeave={() => setHoveredBar(null)}
                        />
                        {/* Bar */}
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          ry="4"
                          fill={isHovered ? "#60a5fa" : "#3b82f6"}
                          style={{ transition: "all 0.2s ease" }}
                        />
                        {/* X-Axis Category Name */}
                        <text
                          x={barX + barWidth / 2}
                          y={chartHeight - 8}
                          className="adb-axis-label adb-axis-label--x"
                          textAnchor="middle"
                        >
                          {cat.category?.length > 10
                            ? cat.category.slice(0, 8) + "…"
                            : cat.category}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredBar && (
                  <div
                    className="adb-chart-tooltip"
                    style={{
                      left: `${(hoveredBar.x / chartWidth) * 100}%`,
                      top: `${(hoveredBar.y / chartHeight) * 100}%`,
                    }}
                  >
                    <div className="adb-tooltip-title">{hoveredBar.category}</div>
                    <div className="adb-tooltip-val">{formatCurrency(hoveredBar.sales)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Orders Table Card ────────────────────── */}
      <div className="adb-orders-card">
        <div className="adb-orders-header">
          <h2 className="adb-orders-title">Recent Orders</h2>
        </div>

        <div className="adb-orders-body">
          {loading ? (
            <div className="adb-table-skeleton-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="adb-table-skeleton-row" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="adb-orders-empty">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <div className="adb-orders-empty-title">No recent orders found.</div>
              <div className="adb-orders-empty-desc">
                When customers place hardware orders, they will appear dynamically in this table.
              </div>
            </div>
          ) : (
            <div className="adb-table-wrap">
              <table className="adb-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="adb-cell-order-id">
                        {ord.order_number?.startsWith("#") ? ord.order_number : `#${ord.order_number}`}
                      </td>
                      <td className="adb-cell-customer">
                        {ord.customer}
                      </td>
                      <td className="adb-cell-product">
                        {ord.product}
                      </td>
                      <td className="adb-cell-amount">
                        {formatCurrency(ord.amount)}
                      </td>
                      <td className="adb-cell-status">
                        {renderStatusBadge(ord.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
