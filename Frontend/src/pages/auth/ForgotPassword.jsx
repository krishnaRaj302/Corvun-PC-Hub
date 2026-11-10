import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";
import "./ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event) => {
  event.preventDefault();

  setErrorMessage("");
  setSuccessMessage("");

  if (!email.trim()) {
    setErrorMessage("Please enter your email address.");
    return;
  }

  setIsLoading(true);

  try {
    const data = await forgotPassword(
      email.trim().toLowerCase()
    );

    console.log("Forgot password response:", data);

    setSuccessMessage(
      data.message || "Reset OTP has been sent successfully."
    );

   setTimeout(() => {
  navigate("/verify-otp", {
    state: {
      email: email.trim().toLowerCase(),
      purpose: "password_reset",
    },
  });
}, 1200);

  } catch (error) {
    console.error("Forgot password error:", error);

    if (error.response?.data?.error) {
      setErrorMessage(error.response.data.error);
    } else if (error.response?.data?.detail) {
      setErrorMessage(error.response.data.detail);
    } else if (error.response?.data?.message) {
      setErrorMessage(error.response.data.message);
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
    <div className="forgot-password-page">
      <div className="forgot-password-card">

        {/* Protocol Badge */}
        <div className="corvun-protocol-badge">
          <span className="badge-dot"></span>

          <span className="badge-text">
            ACCOUNT RECOVERY // SECURE_RESET
          </span>
        </div>

        {/* Header */}
        <div className="auth-card-header">
          <h1 className="auth-main-title">
            Forgot Password?
          </h1>

          <p className="auth-subtitle">
            Enter your registered email address and we will
            initiate a secure password recovery sequence.
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="auth-feedback-box error-box">
            <span className="feedback-icon">!</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="auth-feedback-box success-box">
            <span className="feedback-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">

            <div className="form-label-row">
              <label
                htmlFor="forgot-email"
                className="form-label"
              >
                IDENTITY / SECURE_ID
              </label>

              <span className="label-meta">
                SYS_INPUT_01
              </span>
            </div>

            <div className="input-field-wrapper">

              <span
                className="input-prefix-icon"
                aria-hidden="true"
              >
                @
              </span>

              <input
                id="forgot-email"
                name="email"
                type="email"
                className="corvun-input"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="e.g. builder@corvun.com"
                autoComplete="email"
              />

            </div>
          </div>

          <button
            type="submit"
            className="corvun-btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading-content">
                <span className="btn-spinner"></span>
                INITIALIZING RECOVERY...
              </span>
            ) : (
              <span className="btn-content">
                Send Reset Code
                <span className="btn-arrow">→</span>
              </span>
            )}
          </button>

        </form>

        {/* Back to Login */}
        <div className="auth-card-footer">
          <span>
            Remember your password?
          </span>

          <Link
            to="/login"
            className="footer-nav-link"
          >
            Back to Login
            <span className="nav-arrow">↗</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;