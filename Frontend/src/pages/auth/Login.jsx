import { useState } from "react";
import { Link } from "react-router-dom";
import { loginUser } from "../../services/authService";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

 const handleSubmit = async (event) => {
  event.preventDefault();

  setErrorMessage("");
  setSuccessMessage("");

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
    const data = await loginUser(
      email.trim().toLowerCase(),
      password
    );

    console.log("Login response:", data);

    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    setSuccessMessage("Authentication successful.");

  } catch (error) {
    console.error("Login error:", error);

    if (error.response?.data?.detail) {
      setErrorMessage(error.response.data.detail);
    } else {
      setErrorMessage(
        "Unable to connect to the Corvun authentication server."
      );
    }
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="login-page">
      <div className="login-card-content">

        {/* Protocol Badge */}
        <div className="corvun-protocol-badge">
          <span className="badge-dot"></span>

          <span className="badge-text">
            TELEMETRY ACCESS PROTOCOL // NODE 01
          </span>
        </div>

        {/* Header */}
        <div className="auth-card-header">
          <h1 className="auth-main-title">
            Login In to Corvun
          </h1>

          <p className="auth-subtitle">
            Access your saved hardware configurations, live order tracking,
            and rig benchmarks.
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="auth-feedback-box error-box">
            <span className="feedback-icon">!</span>

            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="auth-feedback-box success-box">
            <span className="feedback-icon">✓</span>

            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Email */}
          <div className="form-group">

            <div className="form-label-row">
              <label
                htmlFor="email"
                className="form-label"
              >
                IDENTITY / SECURE_ID
              </label>

              <span className="label-meta">
                SYS_INPUT_01
              </span>
            </div>

            <div className="input-field-wrapper">

              <span className="input-prefix-icon">
                ⌁
              </span>

              <input
                id="email"
                name="email"
                type="email"
                className="corvun-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="e.g. builder@corvun.com"
              />

            </div>
          </div>

          {/* Password */}
          <div className="form-group">

            <div className="form-label-row">

              <label
                htmlFor="password"
                className="form-label"
              >
                PASSPHRASE
              </label>

              <Link
                to="/forgot-password"
                className="forgot-password-link"
              >
                Forgot Password?
              </Link>

            </div>

            <div className="input-field-wrapper">

              <span className="input-prefix-icon">
                🔒
              </span>

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="corvun-input has-suffix"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your passphrase"
              />

              <button
                type="button"
                className="input-suffix-action"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "◉" : "○"}
              </button>

            </div>
          </div>

          {/* Remember */}
          <div className="remember-row">

            <label className="checkbox-container">

              <input
                type="checkbox"
                className="corvun-checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
              />

              <span className="checkbox-custom"></span>

              <span className="checkbox-label-text">
                Remember this workstation
              </span>

            </label>

            <span className="ttl-badge">
              SES_TOKEN_TTL: 30D
            </span>

          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="corvun-btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading-content">

                <span className="btn-spinner"></span>

                AUTHENTICATING NODE...

              </span>
            ) : (
              <span className="btn-content">

                Login Account

                <span className="btn-arrow">
                  →
                </span>

              </span>
            )}
          </button>

        </form>

        {/* Social Divider */}
        <div className="social-auth-divider">

          <span className="divider-line"></span>

          <span className="divider-text">
            OR SIGN IN WITH
          </span>

          <span className="divider-line"></span>

        </div>

        {/* Social Login */}
        <div className="social-buttons-grid">

          <button
            type="button"
            className="corvun-social-btn"
          >
            <span className="social-icon">
              G
            </span>

            Google
          </button>

          <button
            type="button"
            className="corvun-social-btn"
          >
            <span className="social-icon">
              GH
            </span>

            GitHub
          </button>

        </div>

        {/* Footer */}
        <div className="auth-card-footer">

          <span>
            Don't have a Corvun account?
          </span>

          <Link
            to="/signup"
            className="footer-nav-link"
          >
            Register

            <span className="nav-arrow">
              ↗
            </span>
          </Link>

        </div>

      </div>
    </div>
  );
}

export default Login;