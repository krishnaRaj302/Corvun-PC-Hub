import { Link, useLocation } from "react-router-dom";
import "./AuthLayout.css";
import corvunBg from "../assets/corvun_auth_bg.jpg";

/**
 * Corvun Diamond Mark SVG Component
 */
export const CorvunLogo = ({ className = "corvun-logo-icon" }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 2L22 12L12 22L2 12L12 2Z"
      fill="var(--corvun-red)"
    />
    <rect
      x="8.5"
      y="8.5"
      width="7"
      height="7"
      transform="rotate(45 12 12)"
      fill="var(--corvun-bg)"
    />
  </svg>
);

/**
 * AuthLayout: The technical workstation authentication shell.
 * Provides the immersive dark liquid-cooled background, top telemetry gateway bar,
 * corner reticles, and bottom workstation security bar.
 */
function AuthLayout({ children }) {
  const location = useLocation();
  const isSignup = location.pathname.includes("signup");

  const gatewayTitle = isSignup
    ? "SECURE_REGISTRATION_GATEWAY"
    : "SECURE_AUTH_GATEWAY";

  const nodeName = isSignup ? "[CORVUN-GLOBAL-01]" : "[EU-NORTH-04]";
  const latency = isSignup ? "11ms" : "14ms";

  return (
    <div className="auth-viewport">
      {/* Background Graphic & Atmosphere */}
      <div
        className="auth-bg-layer"
        style={{ backgroundImage: `url(${corvunBg})` }}
      />
      <div className="auth-bg-overlay" />
      <div className="auth-bg-grid" />
      <div className="auth-ambient-glow" />

      {/* Top Telemetry Header */}
      <header className="auth-header">
        <div className="auth-header-left">
          <Link to="/" className="auth-brand" aria-label="Corvun Home">
            <CorvunLogo />
            <span className="auth-brand-name">CORVUN</span>
          </Link>
          <span className="auth-header-divider">//</span>
          <span className="auth-gateway-title">{gatewayTitle}</span>
        </div>

        <div className="auth-header-right">
          <div className="auth-telemetry-item">
            <svg
              className="auth-telemetry-icon auth-lock-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>TLS 1.3 // 256-BIT ENCRYPTION</span>
          </div>

          <span className="auth-telemetry-bullet">•</span>

          <div className="auth-telemetry-item">
            <span className="status-dot green-dot" />
            <span>SYSTEM: ACTIVE</span>
          </div>

          <span className="auth-telemetry-bullet">•</span>

          <div className="auth-telemetry-item">
            <span>LATENCY: {latency}</span>
          </div>

          <span className="auth-telemetry-bullet">•</span>

          <div className="auth-telemetry-item node-item">
            <span>NODE: {nodeName}</span>
          </div>
        </div>
      </header>

      {/* Center Workstation Authentication Stage */}
      <main className="auth-stage">
        <div className="auth-panel-wrapper">
          {/* Cybernetic Reticle Corner Brackets */}
          <span className="reticle-corner reticle-tl" aria-hidden="true" />
          <span className="reticle-corner reticle-tr" aria-hidden="true" />
          <span className="reticle-corner reticle-bl" aria-hidden="true" />
          <span className="reticle-corner reticle-br" aria-hidden="true" />

          {/* Rendered Auth Form Page (Login or Signup) */}
          <div className="auth-panel">{children}</div>
        </div>
      </main>

      {/* Bottom Technical Security Footer */}
      <footer className="auth-footer">
        <div className="auth-footer-left">
          <span className="status-dot red-dot" />
          <span className="auth-footer-text">
            CORVUN SYSTEM ARCHITECTURE // WORKSTATION SECURITY
          </span>
        </div>

        <div className="auth-footer-right">
          <span className="auth-footer-metric">HASH: SHA-512/HMAC</span>
          <span className="auth-footer-bullet">•</span>
          <span className="auth-footer-metric">ENCRYPTION: AES-256-GCM</span>
          <span className="auth-footer-bullet">•</span>
          <span className="auth-footer-metric">
            SYSTEM STATUS: <strong className="status-optimal">OPTIMAL</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default AuthLayout;
