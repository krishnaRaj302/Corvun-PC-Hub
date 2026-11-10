import { useState, useEffect, useCallback, useMemo } from "react";
import { getAdminSalesReport } from "../../services/adminSalesService";
import "./AdminSales.css";

/* ─── Currency Formatter ────────────────────────────────────── */
const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export default function AdminSales() {
  /* ── State ─────────────────────────────────────────────────── */
  const [activePeriod, setActivePeriod] = useState("last_30_days");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Fetch Sales Report ────────────────────────────────────── */
  const fetchReport = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminSalesReport(period);
      setReportData(data);
    } catch (err) {
      console.error("AdminSales fetch error:", err);
      setError("Unable to load sales report data. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(activePeriod);
  }, [activePeriod, fetchReport]);

  /* ── Period Selector Change ────────────────────────────────── */
  const handlePeriodChange = (periodKey) => {
    setActivePeriod(periodKey);
  };

  /* ── CSV Export Functionality ──────────────────────────────── */
  const handleExportCSV = () => {
    if (!reportData) return;
    const { summary, top_products, sales_by_category, recent_transactions, period_label } = reportData;

    let csv = `CORVUN SALES REPORT - ${(period_label || activePeriod).toUpperCase()}\n`;
    csv += `Generated Date: ${new Date().toISOString().split("T")[0]}\n\n`;

    csv += `KPI SUMMARY\n`;
    csv += `Total Sales,Orders,Avg Order Value,Products Sold\n`;
    csv += `"${formatCurrency(summary.total_sales)}",${summary.orders},"${formatCurrency(summary.average_order_value)}",${summary.products_sold}\n\n`;

    csv += `TOP SELLING PRODUCTS\n`;
    csv += `Rank,Product Name,Units Sold,Sales Amount\n`;
    (top_products || []).forEach((p) => {
      csv += `${p.rank},"${p.product_name}",${p.units_sold},"${formatCurrency(p.sales_amount)}"\n`;
    });
    csv += `\n`;

    csv += `SALES BY CATEGORY\n`;
    csv += `Category Name,Sales Amount,Percentage of Total\n`;
    (sales_by_category || []).forEach((c) => {
      csv += `"${c.category}","${formatCurrency(c.sales_amount)}",${c.percentage}%\n`;
    });
    csv += `\n`;

    csv += `RECENT TRANSACTIONS\n`;
    csv += `Order ID,Customer,Product,Date,Price\n`;
    (recent_transactions || []).forEach((t) => {
      csv += `"${t.order_id}","${t.customer}","${t.product}",${t.date},"${formatCurrency(t.price)}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${activePeriod}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ── SVG Chart Calculations ────────────────────────────────── */
  const chartPoints = useMemo(() => {
    const rawTrend = reportData?.sales_trend || [];
    if (rawTrend.length === 0) return { path: "", areaPath: "", points: [], maxY: 320000, yTicks: [320000, 240000, 160000, 80000, 0] };

    const maxVal = Math.max(...rawTrend.map((p) => p.sales), 0);
    // Find nearest round ceiling for Y-axis
    let maxY = 320000;
    if (maxVal > 0) {
      const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
      maxY = Math.ceil((maxVal * 1.25) / mag) * mag;
      if (maxY < 100) maxY = 100;
    }
    const yTicks = [
      maxY,
      Math.round(maxY * 0.75),
      Math.round(maxY * 0.5),
      Math.round(maxY * 0.25),
      0,
    ];

    const width = 900;
    const height = 240;
    const paddingLeft = 10;
    const paddingRight = 10;
    const availableWidth = width - paddingLeft - paddingRight;

    const coords = rawTrend.map((item, index) => {
      const x = paddingLeft + (index / Math.max(rawTrend.length - 1, 1)) * availableWidth;
      const y = height - (maxY > 0 ? (item.sales / maxY) * height : 0);
      return { x, y, ...item };
    });

    if (coords.length === 0) {
      return { path: "", areaPath: "", points: [], maxY, yTicks };
    }

    // Generate smooth bezier curve path
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const lastPoint = coords[coords.length - 1];
    const firstPoint = coords[0];
    const areaPath = `${path} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;

    return { path, areaPath, points: coords, maxY, yTicks };
  }, [reportData?.sales_trend]);

  const summary = reportData?.summary || {
    total_sales: 0,
    orders: 0,
    average_order_value: 0,
    products_sold: 0,
  };

  const comparison = reportData?.comparison || {
    sales_text: "0% from previous period",
    orders_text: "0% from previous period",
    aov_text: "₹0 from previous period",
    products_text: "0% from previous period",
    sales_positive: true,
    orders_positive: true,
    aov_positive: true,
    products_positive: true,
  };

  const topProducts = reportData?.top_products || [];
  const salesByCategory = reportData?.sales_by_category || [];
  const recentTransactions = reportData?.recent_transactions || [];

  return (
    <div className="sl-page">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="sl-header">
        <div className="sl-header-left">
          <h1 className="sl-title">Sales Report</h1>
          <p className="sl-subtitle">Comprehensive view of your sales performance</p>
        </div>
        <div className="sl-header-right">
          <button
            type="button"
            className="sl-export-btn"
            onClick={handleExportCSV}
            title="Download CSV report"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* ── Period Selector Tabs (Exact Figma style) ──────────── */}
      <div className="sl-period-tabs">
        <button
          type="button"
          className={`sl-period-tab ${activePeriod === "fixed" ? "sl-period-tab--active" : ""}`}
          onClick={() => handlePeriodChange("fixed")}
        >
          Fixed Period
        </button>
        <button
          type="button"
          className={`sl-period-tab ${activePeriod === "last_7_days" ? "sl-period-tab--active" : ""}`}
          onClick={() => handlePeriodChange("last_7_days")}
        >
          Last 7 Days
        </button>
        <button
          type="button"
          className={`sl-period-tab ${activePeriod === "last_30_days" ? "sl-period-tab--active" : ""}`}
          onClick={() => handlePeriodChange("last_30_days")}
        >
          Last 30 Days
        </button>
        <button
          type="button"
          className={`sl-period-tab ${activePeriod === "this_year" ? "sl-period-tab--active" : ""}`}
          onClick={() => handlePeriodChange("this_year")}
        >
          This Year
        </button>
      </div>

      {/* ── Error Banner ──────────────────────────────────────── */}
      {error && (
        <div className="sl-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="sl-btn-retry" onClick={() => fetchReport(activePeriod)}>
            Retry
          </button>
        </div>
      )}

      {/* ── 4 KPI Cards (Exact Figma style) ───────────────────── */}
      <div className="sl-kpi-grid">
        {/* Card 1: Total Sales */}
        <div className="sl-kpi-card">
          <div className="sl-kpi-info">
            <span className="sl-kpi-label">Total Sales</span>
            <span className="sl-kpi-value">{formatCurrency(summary.total_sales)}</span>
            <span className={`sl-kpi-trend ${comparison.sales_positive ? "sl-kpi-trend--up" : "sl-kpi-trend--down"}`}>
              {comparison.sales_text}
            </span>
          </div>
          <div className="sl-kpi-icon sl-kpi-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
        </div>

        {/* Card 2: Orders */}
        <div className="sl-kpi-card">
          <div className="sl-kpi-info">
            <span className="sl-kpi-label">Orders</span>
            <span className="sl-kpi-value">{summary.orders.toLocaleString("en-IN")}</span>
            <span className={`sl-kpi-trend ${comparison.orders_positive ? "sl-kpi-trend--up" : "sl-kpi-trend--down"}`}>
              {comparison.orders_text}
            </span>
          </div>
          <div className="sl-kpi-icon sl-kpi-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
        </div>

        {/* Card 3: Avg Order Value */}
        <div className="sl-kpi-card">
          <div className="sl-kpi-info">
            <span className="sl-kpi-label">Avg Order Value</span>
            <span className="sl-kpi-value">{formatCurrency(summary.average_order_value)}</span>
            <span className={`sl-kpi-trend ${comparison.aov_positive ? "sl-kpi-trend--up" : "sl-kpi-trend--down"}`}>
              {comparison.aov_text}
            </span>
          </div>
          <div className="sl-kpi-icon sl-kpi-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>

        {/* Card 4: Products Sold */}
        <div className="sl-kpi-card">
          <div className="sl-kpi-info">
            <span className="sl-kpi-label">Products Sold</span>
            <span className="sl-kpi-value">{summary.products_sold.toLocaleString("en-IN")}</span>
            <span className={`sl-kpi-trend ${comparison.products_positive ? "sl-kpi-trend--up" : "sl-kpi-trend--down"}`}>
              {comparison.products_text}
            </span>
          </div>
          <div className="sl-kpi-icon sl-kpi-icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Sales Trend Large Card (Exact Figma style) ────────── */}
      <div className="sl-chart-card">
        <h2 className="sl-card-title">Sales Trend</h2>

        <div className="sl-chart-container">
          {/* Y-Axis scale labels */}
          <div className="sl-chart-y-axis">
            {chartPoints.yTicks.map((tick, i) => (
              <span key={i} className="sl-chart-tick-label">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
              </span>
            ))}
          </div>

          {/* SVG Canvas */}
          <div className="sl-chart-svg-wrapper">
            <svg
              className="sl-chart-svg"
              viewBox="0 0 900 240"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="slAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 60, 120, 180, 240].map((y, idx) => (
                <line
                  key={idx}
                  x1="0"
                  y1={y}
                  x2="900"
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Gradient Area Fill */}
              {chartPoints.areaPath && (
                <path d={chartPoints.areaPath} fill="url(#slAreaGrad)" />
              )}

              {/* Red Line */}
              {chartPoints.path && (
                <path
                  d={chartPoints.path}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Glowing End Dot (matching Figma screenshot) */}
              {chartPoints.points.length > 0 && (
                <g>
                  <circle
                    cx={chartPoints.points[chartPoints.points.length - 1].x}
                    cy={chartPoints.points[chartPoints.points.length - 1].y}
                    r="6"
                    fill="#ef4444"
                  />
                  <circle
                    cx={chartPoints.points[chartPoints.points.length - 1].x}
                    cy={chartPoints.points[chartPoints.points.length - 1].y}
                    r="3.5"
                    fill="#ffffff"
                  />
                </g>
              )}
            </svg>

            {/* X-Axis Month / Date Labels */}
            <div className="sl-chart-x-axis">
              {chartPoints.points.map((pt, idx) => (
                <span key={idx} className="sl-chart-x-label">
                  {pt.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Section: Top Selling Products & Sales By Category ── */}
      <div className="sl-two-col-grid">
        {/* Left: Top Selling Products */}
        <div className="sl-panel-card">
          <h2 className="sl-card-title">Top Selling Products</h2>

          {loading ? (
            <div className="sl-card-loading">Loading products...</div>
          ) : topProducts.length === 0 ? (
            <div className="sl-empty-notice">No sales data available.</div>
          ) : (
            <div className="sl-top-products-list">
              {topProducts.map((prod) => (
                <div key={prod.rank} className="sl-top-product-item">
                  <div className="sl-product-rank">{prod.rank}</div>
                  <div className="sl-product-details">
                    <span className="sl-product-name">{prod.product_name}</span>
                    <span className="sl-product-units">{prod.units_sold} units sold</span>
                  </div>
                  <div className="sl-product-amount">
                    {formatCurrency(prod.sales_amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sales by Category */}
        <div className="sl-panel-card">
          <h2 className="sl-card-title">Sales by Category</h2>

          {loading ? (
            <div className="sl-card-loading">Loading categories...</div>
          ) : salesByCategory.length === 0 ? (
            <div className="sl-empty-notice">No category sales data available.</div>
          ) : (
            <div className="sl-category-list">
              {salesByCategory.map((cat, i) => (
                <div key={i} className="sl-category-item">
                  <div className="sl-category-header">
                    <span className="sl-category-name">{cat.category}</span>
                    <span className="sl-category-amount">{formatCurrency(cat.sales_amount)}</span>
                  </div>
                  <div className="sl-progress-track">
                    <div
                      className="sl-progress-fill"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="sl-category-footer">
                    <span className="sl-category-pct">{cat.percentage}% of total sales</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Recent Transactions ───────────────── */}
      <div className="sl-panel-card">
        <h2 className="sl-card-title">Recent Transactions</h2>

        <div className="sl-table-card">
          {loading ? (
            <div className="sl-card-loading">Loading transactions...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="sl-empty-notice">No transactions found.</div>
          ) : (
            <div className="sl-table-responsive">
              <table className="sl-table">
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>CUSTOMER</th>
                    <th>PRODUCT</th>
                    <th>DATE</th>
                    <th style={{ textAlign: "right" }}>PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, idx) => (
                    <tr key={idx} className="sl-table-row">
                      <td>
                        <span className="sl-tx-id">{tx.order_id}</span>
                      </td>
                      <td>
                        <span className="sl-tx-customer">{tx.customer}</span>
                      </td>
                      <td>
                        <span className="sl-tx-product">{tx.product}</span>
                      </td>
                      <td>
                        <span className="sl-tx-date">{tx.date}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="sl-tx-price">{formatCurrency(tx.price)}</span>
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
