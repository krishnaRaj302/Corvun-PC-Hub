import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#07080b",
        color: "#8e95a5",
        fontFamily: "'JetBrains Mono', monospace",
        gap: "16px"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "2px solid #20242e",
          borderTopColor: "#ef3842",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <div style={{ fontSize: "14px", letterSpacing: "1px" }}>
          AUTHENTICATING CLEARANCE...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated or role is not admin -> redirect to admin login
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <Navigate
        to="/admin/login"
        state={{
          from: location.pathname,
          denied: isAuthenticated && user?.role !== "admin",
        }}
        replace
      />
    );
  }

  return <Outlet />;
}
