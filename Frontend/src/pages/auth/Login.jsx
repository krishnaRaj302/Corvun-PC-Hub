import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Basic frontend validations
    if (!email.trim()) {
      setErrorMessage("Please enter your SECURE_ID (email address).");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your passphrase.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser({
        email: email.trim().toLowerCase(),
        password: password,
      });

      // Store tokens on successful authentication
      if (response.access) {
        localStorage.setItem("corvun_access_token", response.access);
      }
      if (response.refresh) {
        localStorage.setItem("corvun_refresh_token", response.refresh);
      }

      setSuccessMessage("Authentication verified. Loading telemetry...");

      // Short delay for visual verification
      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      console.error("Login Error:", err);
      if (err.response?.data?.error) {
        setErrorMessage(err.response.data.error);
      } else if (err.response?.data?.detail) {
        setErrorMessage(err.response.data.detail);
      } else if (err.message && err.message.includes("Network Error")) {
        setErrorMessage(
          "Backend gateway offline. Please ensure Django server is running on port 8000."
        );
      } else {
        setErrorMessage(
          "Authentication failed. Please verify credentials and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-card-content">
      {/* Top Technical Protocol Pill Badge */}
      <div className="corvun-protocol-badge">
        <span className="badge-dot" />
        <span className="badge-text">TELEMETRY ACCESS PROTOCOL // NODE 01</span>
      </div>

      {/* Heading & Subtitle */}
      <div className="auth-card-header">
        <h1 className="auth-main-title">Login In to Corvun</h1>
        <p className="auth-subtitle">
          Access your saved hardware configurations, live order tracking, and rig
          benchmarks.
        </p>
      </div>

      {/* Error / Success Telemetry Notices */}
      {errorMessage && (
        <div className="auth-feedback-box error-box" role="alert">
          <svg
            className="feedback-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="auth-feedback-box success-box" role="status">
          <svg
            className="feedback-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Email / Secure ID */}
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="login-email" className="form-label">
              IDENTITY / SECURE_ID
            </label>
            <span className="label-meta">SYS_INPUT_01</span>
          </div>

          <div className="input-field-wrapper">
            <span className="input-prefix-icon" aria-hidden="true">
              {/* Identity Chip Icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <path d="M9 1v3" />
                <path d="M15 1v3" />
                <path d="M9 20v3" />
                <path d="M15 20v3" />
                <path d="M20 9h3" />
                <path d="M20 14h3" />
                <path d="M1 9h3" />
                <path d="M1 14h3" />
              </svg>
            </span>

            <input
              id="login-email"
              type="email"
              className="corvun-input"
              placeholder="e.g. builder@corvun.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password / Passphrase */}
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="login-password" className="form-label">
              PASSPHRASE
            </label>
            <Link
              to="/forgot-password"
              className="forgot-password-link"
              tabIndex={0}
            >
              Forgot Password?
            </Link>
          </div>

          <div className="input-field-wrapper">
            <span className="input-prefix-icon" aria-hidden="true">
              {/* Lock Icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>

            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="corvun-input has-suffix"
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="input-suffix-action"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                /* Eye Off Icon */
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                /* Eye Icon */
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember Workstation Row */}
        <div className="remember-row">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="corvun-checkbox"
            />
            <span className="checkbox-custom" />
            <span className="checkbox-label-text">Remember this workstation</span>
          </label>

          <span className="ttl-badge">SES_TOKEN_TTL: 30D</span>
        </div>

        {/* Primary CTA Button */}
        <button
          type="submit"
          className="corvun-btn-primary"
          disabled={isLoading}
          id="login-submit-btn"
        >
          {isLoading ? (
            <span className="btn-loading-content">
              <span className="btn-spinner" />
              <span>AUTHENTICATING NODE...</span>
            </span>
          ) : (
            <span className="btn-content">
              <span>Login Account</span>
              <span className="btn-arrow">→</span>
            </span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="social-auth-divider">
        <span className="divider-line" />
        <span className="divider-text">OR SIGN IN WITH</span>
        <span className="divider-line" />
      </div>

      {/* Social Logins */}
      <div className="social-buttons-grid">
        <button
          type="button"
          className="corvun-social-btn"
          aria-label="Sign in with Google"
        >
          <svg className="social-icon" width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google</span>
        </button>

        <button
          type="button"
          className="corvun-social-btn"
          aria-label="Sign in with GitHub"
        >
          <svg
            className="social-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span>GitHub</span>
        </button>
      </div>

      {/* Footer Navigation */}
      <div className="auth-card-footer">
        <span className="footer-nav-text">Don't have a Corvun account?</span>
        <Link to="/signup" className="footer-nav-link" id="nav-to-signup">
          <span>Register</span>
          <span className="nav-arrow">↗Sign</span>
        </Link>
      </div>
    </div>
  );
}

export default Login;
