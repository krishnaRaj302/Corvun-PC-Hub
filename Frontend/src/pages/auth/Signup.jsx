import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../../services/api";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  // ==========================================
  // FORM STATE
  // ==========================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ==========================================
  // PASSWORD VISIBILITY
  // ==========================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ==========================================
  // FEEDBACK STATE
  // ==========================================

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // SIGNUP SUBMIT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setErrorMessages([]);
    setSuccessMessage("");

    const errors = [];

    // ==========================================
    // CLIENT-SIDE VALIDATION
    // ==========================================

    if (!fullName.trim()) {
      errors.push("Full Name is required [ID_REQ].");
    }

    if (!email.trim()) {
      errors.push("Email Address is required [SYS_IDENT].");
    }

    if (!password) {
      errors.push("Password is required [MIN 8 CHARS].");
    } else if (password.length < 8) {
      errors.push("Password must contain at least 8 characters.");
    }

    if (!confirmPassword) {
      errors.push("Please confirm your password [MATCH_VAL].");
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match [MATCH_VAL].");
    }

    if (!termsAccepted) {
      errors.push(
        "You must agree to the Terms of Service and Privacy Policy for Corvun."
      );
    }

    // Stop if validation errors exist
    if (errors.length > 0) {
      setErrorMessages(errors);
      return;
    }

    // ==========================================
    // START API REQUEST
    // ==========================================

    setIsLoading(true);

    try {
      const signupData = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      };

      const response = await signupUser(signupData);

      console.log("Signup response:", response);

      // ==========================================
      // SUCCESS
      // ==========================================

      setSuccessMessage(
        response?.message ||
          "Signup successful! Please verify your email to activate your workstation."
      );

      /*
        Signup is successful.

        The backend sends an OTP to the user's email.
        Therefore, we go to the OTP verification page,
        NOT directly to Login.
      */

      setTimeout(() => {
        navigate("/verify-otp", {
          state: {
            email: email.trim().toLowerCase(),
          },
        });
      }, 1500);

    } catch (err) {
      console.error("Signup Error:", err);

      const apiErrors = [];

      // ==========================================
      // DJANGO / API ERRORS
      // ==========================================

      if (err.response?.data) {
        const data = err.response.data;

        // Simple string response
        if (typeof data === "string") {
          apiErrors.push(data);
        }

        // Custom error response
        else if (data.error) {
          apiErrors.push(data.error);
        }

        // DRF detail response
        else if (data.detail) {
          apiErrors.push(data.detail);
        }

        // Serializer field errors
        else {
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((message) => {
                apiErrors.push(`${field}: ${message}`);
              });
            } else {
              apiErrors.push(`${field}: ${messages}`);
            }
          });
        }
      }

      // ==========================================
      // BACKEND CONNECTION ERROR
      // ==========================================

      else if (err.request) {
        apiErrors.push(
          "Backend gateway offline. Please ensure Django server is running on port 8001."
        );
      }

      // ==========================================
      // UNKNOWN ERROR
      // ==========================================

      else {
        apiErrors.push(
          "Registration failed. Please check your details and try again."
        );
      }

      setErrorMessages(
        apiErrors.length > 0
          ? apiErrors
          : ["Registration error."]
      );

    } finally {
      // Stop loading in both success and error cases
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-card-content">

      {/* ==========================================
          PROTOCOL BADGE
          ========================================== */}

      <div className="corvun-protocol-badge">
        <span className="badge-dot"></span>

        <span className="badge-text">
          BUILDER IDENTITY // NEW_ACCOUNT
        </span>
      </div>

      {/* ==========================================
          HEADER
          ========================================== */}

      <div className="auth-card-header">
        <h1 className="auth-main-title">
          Create Account
        </h1>

        <p className="auth-subtitle">
          Join Corvun to configure custom liquid rigs, save
          component matrices, and track high-performance builds.
        </p>
      </div>

      {/* ==========================================
          ERROR MESSAGE
          ========================================== */}

      {errorMessages.length > 0 && (
        <div
          className="auth-feedback-box error-box"
          role="alert"
        >
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
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>

          <div className="error-list">
            {errorMessages.map((message, index) => (
              <span
                key={index}
                className="error-line"
              >
                {message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          SUCCESS MESSAGE
          ========================================== */}

      {successMessage && (
        <div
          className="auth-feedback-box success-box"
          role="status"
        >
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

      {/* ==========================================
          SIGNUP FORM
          ========================================== */}

      <form
        onSubmit={handleSubmit}
        className="auth-form"
        noValidate
      >

        {/* ==========================================
            FULL NAME
            ========================================== */}

        <div className="form-group">

          <div className="form-label-row">
            <label
              htmlFor="signup-fullname"
              className="form-label"
            >
              FULL NAME
            </label>

            <span className="label-meta">
              ID_REQ
            </span>
          </div>

          <div className="input-field-wrapper">

            <span
              className="input-prefix-icon"
              aria-hidden="true"
            >
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                />
              </svg>
            </span>

            <input
              id="signup-fullname"
              type="text"
              className="corvun-input"
              placeholder="e.g. Kishan Raj"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              autoComplete="name"
              required
            />

          </div>
        </div>

        {/* ==========================================
            EMAIL
            ========================================== */}

        <div className="form-group">

          <div className="form-label-row">

            <label
              htmlFor="signup-email"
              className="form-label"
            >
              EMAIL ADDRESS
            </label>

            <span className="label-meta">
              SYS_IDENT
            </span>

          </div>

          <div className="input-field-wrapper">

            <span
              className="input-prefix-icon"
              aria-hidden="true"
            >
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>

            <input
              id="signup-email"
              type="email"
              className="corvun-input"
              placeholder="kishan.raj@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              required
            />

          </div>
        </div>

        {/* ==========================================
            PASSWORD
            ========================================== */}

        <div className="form-group">

          <div className="form-label-row">

            <label
              htmlFor="signup-password"
              className="form-label"
            >
              PASSWORD
            </label>

            <span className="label-meta">
              MIN 8 CHARS
            </span>

          </div>

          <div className="input-field-wrapper">

            <span
              className="input-prefix-icon"
              aria-hidden="true"
            >
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
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  ry="2"
                />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>

            <input
              id="signup-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              className="corvun-input has-suffix"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="new-password"
              required
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
              {showPassword ? (
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
                  <line
                    x1="1"
                    y1="1"
                    x2="23"
                    y2="23"
                  />
                </svg>
              ) : (
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
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                  />
                </svg>
              )}
            </button>

          </div>
        </div>

        {/* ==========================================
            CONFIRM PASSWORD
            ========================================== */}

        <div className="form-group">

          <div className="form-label-row">

            <label
              htmlFor="signup-confirm-password"
              className="form-label"
            >
              CONFIRM PASSWORD
            </label>

            <span className="label-meta">
              MATCH_VAL
            </span>

          </div>

          <div className="input-field-wrapper">

            <span
              className="input-prefix-icon"
              aria-hidden="true"
            >
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>

            <input
              id="signup-confirm-password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              className="corvun-input has-suffix"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              autoComplete="new-password"
              required
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
              {showConfirmPassword ? (
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
                  <line
                    x1="1"
                    y1="1"
                    x2="23"
                    y2="23"
                  />
                </svg>
              ) : (
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
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                  />
                </svg>
              )}
            </button>

          </div>
        </div>

        {/* ==========================================
            TERMS
            ========================================== */}

        <div className="terms-row">

          <label className="checkbox-container">

            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) =>
                setTermsAccepted(
                  e.target.checked
                )
              }
              className="corvun-checkbox"
              id="signup-terms"
            />

            <span className="checkbox-custom"></span>

            <span className="terms-label-text">
              I agree to the{" "}
              <span className="terms-highlight">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="terms-highlight">
                Privacy Policy
              </span>{" "}
              for Corvun
            </span>

          </label>

        </div>

        {/* ==========================================
            CREATE ACCOUNT
            ========================================== */}

        <button
          type="submit"
          className="corvun-btn-primary"
          disabled={isLoading}
          id="signup-submit-btn"
        >
          {isLoading ? (
            <span className="btn-loading-content">

              <span className="btn-spinner"></span>

              <span>
                INITIALIZING WORKSTATION...
              </span>

            </span>
          ) : (
            <span className="btn-content">

              <span>
                Create Account
              </span>

              <span className="btn-arrow">
                →
              </span>

            </span>
          )}
        </button>

      </form>

      {/* ==========================================
          LOGIN NAVIGATION
          ========================================== */}

      <div className="auth-card-footer signup-footer-spacing">

        <span className="footer-nav-text">
          Already have a Corvun account?
        </span>

        <Link
          to="/login"
          className="footer-nav-link"
          id="nav-to-login"
        >
          <span>Login</span>

          <span className="nav-arrow">
            →
          </span>
        </Link>

      </div>

    </div>
  );
}

export default Signup;