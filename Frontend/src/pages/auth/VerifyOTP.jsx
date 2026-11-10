import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  verifyOtp,
  verifyResetOtp,
} from "../../services/authService";
import "./VerifyOTP.css";

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email received from Signup or Forgot Password
  const emailFromSignup = location.state?.email || "";

  // Decide which OTP verification flow is being used
  // signup = normal account verification
  // password_reset = forgot password verification
  const purpose = location.state?.purpose || "signup";

  const [email, setEmail] = useState(emailFromSignup);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Backend OTP expires in 5 minutes
  const [timeLeft, setTimeLeft] = useState(300);

  // Resend cooldown
  const [resendTime, setResendTime] = useState(30);

  const inputRefs = useRef([]);

  // ==========================================
  // OTP EXPIRY TIMER
  // ==========================================

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previousTime) => previousTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // ==========================================
  // RESEND TIMER
  // ==========================================

  useEffect(() => {
    if (resendTime <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendTime((previousTime) => previousTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTime]);

  // ==========================================
  // FORMAT TIMER
  // ==========================================

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ==========================================
  // OTP INPUT
  // ==========================================

  const handleOtpChange = (index, value) => {
    // Allow only numbers
    const numericValue = value.replace(/\D/g, "");

    if (!numericValue) {
      const updatedOtp = [...otp];
      updatedOtp[index] = "";
      setOtp(updatedOtp);
      return;
    }

    const updatedOtp = [...otp];

    updatedOtp[index] = numericValue.slice(-1);

    setOtp(updatedOtp);
    setErrorMessage("");
    setSuccessMessage("");

    // Move to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // ==========================================
  // BACKSPACE HANDLING
  // ==========================================

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ==========================================
  // PASTE OTP
  // ==========================================

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedText = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedText) {
      return;
    }

    const pastedOtp = ["", "", "", "", "", ""];

    pastedText.split("").forEach((digit, index) => {
      pastedOtp[index] = digit;
    });

    setOtp(pastedOtp);
    setErrorMessage("");
    setSuccessMessage("");

    const nextIndex = Math.min(pastedText.length, 5);

    inputRefs.current[nextIndex]?.focus();
  };

  // ==========================================
  // VERIFY OTP
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const enteredOtp = otp.join("");

    // Email validation
    if (!email.trim()) {
      setErrorMessage("Email address is required.");
      return;
    }

    // OTP validation
    if (enteredOtp.length !== 6) {
      setErrorMessage(
        "Please enter the complete 6-digit verification code."
      );
      return;
    }

    // Expiry validation
    if (timeLeft <= 0) {
      setErrorMessage(
        "This verification code has expired. Please request a new OTP."
      );
      return;
    }

    setIsLoading(true);

    try {
      let response;

      // ==========================================
      // SELECT OTP VERIFICATION FLOW
      // ==========================================

      if (purpose === "password_reset") {
        // Forgot Password OTP
        response = await verifyResetOtp(
          email.trim().toLowerCase(),
          enteredOtp
        );
      } else {
        // Signup OTP
        response = await verifyOtp(
          email.trim().toLowerCase(),
          enteredOtp
        );
      }

      console.log("OTP verification response:", response);

      // ==========================================
      // SUCCESS MESSAGE
      // ==========================================

      setSuccessMessage(
        response?.message ||
          "OTP verified successfully."
      );

      // ==========================================
      // NEXT PAGE
      // ==========================================

      setTimeout(() => {
        if (purpose === "password_reset") {
          // Password reset OTP verified
          // Go to Reset Password page
          navigate("/reset-password", {
            state: {
              email: email.trim().toLowerCase(),
            },
          });
        } else {
          // Signup OTP verified
          // Go to Login page
          navigate("/login");
        }
      }, 1500);
    } catch (error) {
      console.error("OTP verification error:", error);

      if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail);
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
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
          "OTP verification failed. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // RESEND OTP
  // ==========================================

  const handleResendOtp = () => {
    if (resendTime > 0) {
      return;
    }

    /*
      The current backend has the Signup OTP endpoint,
      but a separate resend-OTP endpoint has not been
      implemented yet.

      We will connect the real resend API after creating
      the backend resend endpoint.
    */

    setOtp(["", "", "", "", "", ""]);

    setErrorMessage("");

    setSuccessMessage(
      "Resend OTP API will be connected next."
    );

    setResendTime(30);
    setTimeLeft(300);

    inputRefs.current[0]?.focus();
  };

  return (
    <div className="verify-otp-page">

      {/* ==========================================
          TOP SYSTEM HEADER
          ========================================== */}

      <div className="verify-system-header">

        <span className="system-brand">
          CORVUN
        </span>

        <span className="system-divider">
          //
        </span>

        <span className="system-module">
          SECURE_VERIFICATION_GATEWAY
        </span>

        <div className="system-status">

          <span>
            TLS 1.3
          </span>

          <span>
            •
          </span>

          <span>
            256-BIT ENCRYPTION
          </span>

          <span>
            •
          </span>

          <span className="system-active">
            SYSTEM: ACTIVE
          </span>

        </div>
      </div>

      {/* ==========================================
          MAIN CARD
          ========================================== */}

      <main className="verify-otp-main">

        <div className="verify-otp-card">

          {/* Corner decorations */}

          <span className="card-corner corner-top-left"></span>
          <span className="card-corner corner-top-right"></span>
          <span className="card-corner corner-bottom-left"></span>
          <span className="card-corner corner-bottom-right"></span>

          {/* ======================================
              BADGE
              ====================================== */}

          <div className="corvun-protocol-badge">

            <span className="badge-dot"></span>

            <span className="badge-text">
              SECURITY PROTOCOL // IDENTITY_VERIFICATION
            </span>

          </div>

          {/* ======================================
              HEADER
              ====================================== */}

          <div className="verify-header">

            <h1>
              Verify OTP
            </h1>

            <p>
              Please enter the 6-digit verification code
              sent to your email address. You will need
              to verify your account to continue.
            </p>

          </div>

          {/* ======================================
              TARGET EMAIL
              ====================================== */}

          <div className="verify-target-box">

            <div className="target-icon">
              @
            </div>

            <div className="target-content">

              <span className="target-label">
                TARGET
              </span>

              <span className="target-email">
                {email || "your-email@example.com"}
              </span>

            </div>

            <span className="target-meta">
              ID_REQ
            </span>

          </div>

          {/* ======================================
              ERROR
              ====================================== */}

          {errorMessage && (
            <div
              className="verify-feedback error-feedback"
              role="alert"
            >
              <span className="feedback-symbol">
                !
              </span>

              <span>
                {errorMessage}
              </span>
            </div>
          )}

          {/* ======================================
              SUCCESS
              ====================================== */}

          {successMessage && (
            <div
              className="verify-feedback success-feedback"
              role="status"
            >
              <span className="feedback-symbol">
                ✓
              </span>

              <span>
                {successMessage}
              </span>
            </div>
          )}

          {/* ======================================
              FORM
              ====================================== */}

          <form
            className="verify-form"
            onSubmit={handleSubmit}
          >

            {/* OTP LABEL */}

            <div className="otp-label-row">

              <span className="otp-label">
                SECURITY_CODE [6-DIGITS]
              </span>

              <span className="otp-label-meta">
                HEX_HASH
              </span>

            </div>

            {/* OTP BOXES */}

            <div
              className="otp-inputs"
              onPaste={handlePaste}
            >

              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) =>
                    handleOtpChange(
                      index,
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(index, event)
                  }
                  className={`otp-input ${
                    digit ? "otp-filled" : ""
                  }`}
                  aria-label={`OTP digit ${index + 1}`}
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                />
              ))}

            </div>

            {/* ==================================
                OTP STATUS
                ================================== */}

            <div className="otp-status-row">

              <div className="otp-expiry">

                <span className="expiry-icon">
                  ◷
                </span>

                <span>
                  OTP expires in
                </span>

                <strong>
                  {formatTime(timeLeft)}
                </strong>

              </div>

              <span className="attempt-status">
                ATTEMPTS: 1/5
              </span>

            </div>

            {/* ==================================
                VERIFY BUTTON
                ================================== */}

            <button
              type="submit"
              className="verify-button"
              disabled={isLoading}
            >

              {isLoading ? (
                <span className="verify-loading">
                  <span className="verify-spinner"></span>
                  VERIFYING...
                </span>
              ) : (
                <span className="verify-button-content">
                  Verify OTP
                  <span className="verify-arrow">
                    →
                  </span>
                </span>
              )}

            </button>

          </form>

          {/* ======================================
              RESEND SECTION
              ====================================== */}

          <div className="resend-section">

            <span className="resend-question">
              Didn't receive the code?
            </span>

            <button
              type="button"
              className={`resend-button ${
                resendTime > 0
                  ? "resend-disabled"
                  : ""
              }`}
              onClick={handleResendOtp}
              disabled={resendTime > 0}
            >
              Resend OTP
            </button>

            <span className="resend-divider">
              •
            </span>

            <span className="resend-wait">
              {resendTime > 0
                ? `Wait ${resendTime}s`
                : "Ready"}
            </span>

          </div>

          {/* ======================================
              LOGIN LINK
              ====================================== */}

          <div className="verify-footer">

            <span>
              Remember your credentials?
            </span>

            <Link
              to="/login"
              className="back-login-link"
            >
              Back to Login
              <span>→</span>
            </Link>

          </div>

        </div>

      </main>

      {/* ==========================================
          BOTTOM SYSTEM FOOTER
          ========================================== */}

      <div className="verify-system-footer">

        <div>
          <span className="footer-status-dot"></span>
          CORVUN SYSTEM ARCHITECTURE // WORKSTATION SECURITY
        </div>

        <div>
          HASH: SHA-512/HMAC&nbsp;&nbsp;
          ENCRYPTION: AES-256-GCM&nbsp;&nbsp;

          <span className="footer-optimal">
            SYSTEM STATUS: OPTIMAL
          </span>
        </div>

      </div>

    </div>
  );
}

export default VerifyOTP;