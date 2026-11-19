import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050811",
          color: "#94a3b8",
          fontFamily: "'JetBrains Mono', monospace",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "2px solid rgba(255, 255, 255, 0.1)",
            borderTopColor: "#ff1e27",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <div style={{ fontSize: "12px", letterSpacing: "1.5px" }}>
          VERIFYING WORKSTATION CREDENTIALS...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return children;
}
