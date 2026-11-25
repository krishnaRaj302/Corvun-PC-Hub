import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected rendering error.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CORVUN UI ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#07080b",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ef3842",
              letterSpacing: "0.14em",
              marginBottom: "10px",
            }}
          >
            // UI_RECOVERY_PROTOCOL
          </span>
          <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
            Display Interrupted
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", maxWidth: "460px", marginBottom: "20px" }}>
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: "10px 22px",
              backgroundColor: "#ef3842",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Reload CORVUN Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
