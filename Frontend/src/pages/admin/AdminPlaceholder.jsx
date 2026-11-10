import { Link, useLocation } from "react-router-dom";

export default function AdminPlaceholder({ title }) {
  const location = useLocation();
  const name =
    title ||
    location.pathname
      .replace("/admin/", "")
      .replace("-", " ")
      .toUpperCase();

  return (
    <div style={{
      background: "#0d0f15",
      border: "1px solid #1c202a",
      borderRadius: "12px",
      padding: "48px 24px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
      maxWidth: "600px",
      margin: "40px auto"
    }}>
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "10px",
        background: "rgba(239, 56, 66, 0.1)",
        border: "1px solid rgba(239, 56, 66, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px"
      }}>
        ⚙️
      </div>
      <div>
        <span style={{
          fontFamily: "var(--corvun-mono)",
          fontSize: "11px",
          color: "#ef3842",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          fontWeight: 700
        }}>
          MODULE QUEUED // NEXT IMPLEMENTATION PHASE
        </span>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>
          {name}
        </h2>
        <p style={{ fontSize: "13px", color: "#8e95a5", marginTop: "8px", maxWidth: "420px" }}>
          This administrative control subsystem is scheduled for subsequent release. Product Inventory Management is currently active and primary.
        </p>
      </div>
      <Link
        to="/admin/products"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          background: "#ef3842",
          color: "#ffffff",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "var(--corvun-mono)",
          textDecoration: "none",
          marginTop: "8px"
        }}
      >
        GO TO PRODUCTS MANAGEMENT
      </Link>
    </div>
  );
}
