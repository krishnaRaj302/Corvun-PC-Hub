import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/authService";
import "./ResetPassword.css";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email received from Verify OTP page
  const email = location.state?.email || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // RESET PASSWORD
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    // Check email
    if (!email) {
      setErrorMessage(
        "Reset session expired. Please start the password recovery process again."
      );
      return;
    }

    // Check password
    if (!password) {
      setErrorMessage("Please enter your new password.");
      return;
    }

    // Check confirm password
    if (!confirmPassword) {
      setErrorMessage("Please confirm your new password.");
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // ==========================================
      // RESET PASSWORD API
      // ==========================================

      const data = await resetPassword(
        email,
        password,
        confirmPassword
      );

      console.log("Reset password response:", data);

      // ==========================================
      // SUCCESS
      // ==========================================

      setSuccessMessage(
        data.message || "Password reset successfully."
      );

      // Go to Login after successful reset
      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error) {
      console.error("Reset password error:", error);

      // ==========================================
      // BACKEND ERROR
      // ==========================================

      if (error.response?.data?.detail) {
        setErrorMessage(
          error.response.data.detail
        );

      } else if (error.response?.data?.error) {
        setErrorMessage(
          error.response.data.error
        );

      } else if (error.response?.data?.message) {
        setErrorMessage(
          error.response.data.message
        );

      } else if (error.response?.data) {
        const data = error.response.data;

        if (typeof data === "string") {
          setErrorMessage(data);
        } else {
          setErrorMessage(
            Object.values(data)
              .flat()
              .join(" ")
          );
        }

      } else if (error.request) {
        setErrorMessage(
          "Unable to connect to the Corvun authentication server."
        );

      } else {
        setErrorMessage(
          "Password reset failed. Please try again."
        );
      }

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-page">

      {/* ==========================================
          MAIN CARD
          ========================================== */}

      <div className="reset-password-card">

        {/* Protocol Badge */}

        <div className="corvun-protocol-badge">

          <span className="badge-dot"></span>

          <span className="badge-text">
            ACCOUNT RECOVERY // PASSWORD_RESET
          </span>

        </div>

        {/* Header */}

        <div className="auth-card-header">

          <h1 className="auth-main-title">
            Reset Password
          </h1>

          <p className="auth-subtitle">
            Create a new secure password for your Corvun
            account.
          </p>

        </div>

        {/* Target Email */}

        <div className="reset-target-box">

          <span className="reset-target-label">
            RECOVERY_ID
          </span>

          <span className="reset-target-email">
            {email}
          </span>

        </div>

        {/* Error */}

        {errorMessage && (
          <div className="auth-feedback-box error-box">

            <span className="feedback-icon">
              !
            </span>

            <span>
              {errorMessage}
            </span>

          </div>
        )}

        {/* Success */}

        {successMessage && (
          <div className="auth-feedback-box success-box">

            <span className="feedback-icon">
              ✓
            </span>

            <span>
              {successMessage}
            </span>

          </div>
        )}

        {/* Form */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* ======================================
              NEW PASSWORD
              ====================================== */}

          <div className="form-group">

            <div className="form-label-row">

              <label
                htmlFor="new-password"
                className="form-label"
              >
                NEW PASSPHRASE
              </label>

              <span className="label-meta">
                SYS_INPUT_01
              </span>

            </div>

            <div className="input-field-wrapper">

              <span className="input-prefix-icon">
                🔒
              </span>

              <input
                id="new-password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                className="corvun-input has-suffix"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter new password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="input-suffix-action"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
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

          {/* ======================================
              CONFIRM PASSWORD
              ====================================== */}

          <div className="form-group">

            <div className="form-label-row">

              <label
                htmlFor="confirm-password"
                className="form-label"
              >
                CONFIRM PASSPHRASE
              </label>

              <span className="label-meta">
                SYS_INPUT_02
              </span>

            </div>

            <div className="input-field-wrapper">

              <span className="input-prefix-icon">
                🔒
              </span>

              <input
                id="confirm-password"
                name="confirm_password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                className="corvun-input has-suffix"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="input-suffix-action"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword ? "◉" : "○"}
              </button>

            </div>

          </div>

          {/* ======================================
              PASSWORD REQUIREMENT
              ====================================== */}

          <div className="password-requirement">

            <span className="requirement-dot"></span>

            <span>
              Minimum 8 characters with uppercase,
              lowercase, number and special character.
            </span>

          </div>

          {/* ======================================
              SUBMIT BUTTON
              ====================================== */}

          <button
            type="submit"
            className="corvun-btn-primary"
            disabled={isLoading}
          >

            {isLoading ? (

              <span className="btn-loading-content">

                <span className="btn-spinner"></span>

                RESETTING PASSWORD...

              </span>

            ) : (

              <span className="btn-content">

                Reset Password

                <span className="btn-arrow">
                  →
                </span>

              </span>

            )}

          </button>

        </form>

        {/* ======================================
            FOOTER
            ====================================== */}

        <div className="auth-card-footer">

          <span>
            Remember your password?
          </span>

          <Link
            to="/login"
            className="footer-nav-link"
          >

            Back to Login

            <span className="nav-arrow">
              ↗
            </span>

          </Link>

        </div>

      </div>

    </div>
  );
}

export default ResetPassword;