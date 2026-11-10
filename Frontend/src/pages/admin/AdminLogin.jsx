import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const wasDenied = location.state?.denied;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both administrative email and password.");
      return;
    }

    try {
      setLoading(true);
      const authData = await loginUser(email.trim(), password);

      // Authenticate via context and get user profile
      const profile = await login(authData);

      if (!profile || profile.role !== "admin") {
        // Customer account or non-admin -> reject immediately
        await logout();
        setErrorMessage(
          "ACCESS REJECTED: User account does not possess administrator clearance. Customer accounts cannot enter the admin console."
        );
        return;
      }

      // Valid admin -> navigate to admin dashboard
      navigate("/admin/products", { replace: true });
    } catch (err) {
      console.error("Admin login failed:", err);
      const apiError =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Authentication failed. Please verify credentials.";
      setErrorMessage(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <div className="admin-badge">
            <span className="admin-badge-dot"></span>
            RESTRICTED TERMINAL
          </div>
          <h1 className="admin-login-title">CORVUN ADMIN</h1>
          <p className="admin-login-subtitle">
            [CORVUN OS // WORKSTATION CORE CONTROL]
          </p>
        </div>

        {wasDenied && !errorMessage && (
          <div className="admin-login-alert warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Administrator credentials required. Please authenticate with an admin clearance account.</span>
          </div>
        )}

        {errorMessage && (
          <div className="admin-login-alert error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="admin-email">
              ADMINISTRATOR IDENTIFIER (EMAIL)
            </label>
            <div className="admin-input-wrapper">
              <span className="admin-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                id="admin-email"
                type="email"
                className="admin-input"
                placeholder="admin@corvun.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="admin-password">
              SECURITY KEY (PASSWORD)
            </label>
            <div className="admin-input-wrapper">
              <span className="admin-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                className="admin-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>VERIFYING CLEARANCE...</span>
              </>
            ) : (
              <>
                <span>AUTHENTICATE & ENTER</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/" className="admin-store-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Return to Storefront
          </Link>
          <span className="admin-version-tag">CORVUN OS v2.4</span>
        </div>
      </div>
    </div>
  );
}
