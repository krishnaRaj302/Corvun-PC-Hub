import { Link } from "react-router-dom";
import "./PCBuilder.css";

function PCBuilder() {
  return (
    <div className="pc-builder-coming-soon-page">
      <div className="builder-atmosphere-glow" />

      <div className="builder-card">
        <div className="builder-card-reticle-tl" />
        <div className="builder-card-reticle-br" />

        <div className="builder-status-badge">
          <span className="builder-dot" />
          <span>DEVELOPMENT PROTOCOL // PHASE 2 INACTIVE</span>
        </div>

        <h1 className="builder-title">
          PC BUILDER <span className="highlight-text">STUDIO</span>
        </h1>

        <p className="builder-subtitle">
          Next-generation custom liquid cooling configurator, dynamic component compatibility verification, and real-time wattage telemetry are currently under architecture development.
        </p>

        <div className="builder-features-list">
          <div className="b-feature">
            <span className="f-icon">⚡</span>
            <div>
              <strong>Component Compatibility Engine</strong>
              <p>Automated motherboard socket, RAM clearance, and GPU length checking</p>
            </div>
          </div>

          <div className="b-feature">
            <span className="f-icon">❄️</span>
            <div>
              <strong>Liquid Loop Thermal Dissipation Modeling</strong>
              <p>Radiator surface area and pump flow rate calculation for sub-ambient cooling</p>
            </div>
          </div>

          <div className="b-feature">
            <span className="f-icon">📊</span>
            <div>
              <strong>Real-Time Rig Benchmarks</strong>
              <p>Estimated 4K/1440p gaming frame rates and heavy multi-thread render times</p>
            </div>
          </div>
        </div>

        <div className="builder-action-row">
          <div className="status-box">
            <span className="status-label">CURRENT STATUS</span>
            <span className="status-value">COMING SOON</span>
          </div>

          <Link to="/products" className="builder-back-btn">
            Browse Individual Components →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PCBuilder;
