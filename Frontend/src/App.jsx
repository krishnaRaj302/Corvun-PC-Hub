import { Routes, Route } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Navbar from "./components/Navbar";

function App() {
  return (
    <Routes>
      {/* Customer Home Route (Contains Standard Store Navbar) */}
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <h1>Corvun PC</h1>
              <p style={{ color: "var(--corvun-text-secondary)", marginTop: "12px" }}>
                High-Performance Custom Liquid Workstations
              </p>
            </div>
          </>
        }
      />

      {/* Authentication Gateway: Login Route (Standalone AuthLayout) */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />

      {/* Authentication Gateway: Signup Route (Standalone AuthLayout) */}
      <Route
        path="/signup"
        element={
          <AuthLayout>
            <Signup />
          </AuthLayout>
        }
      />
    </Routes>
  );
}

export default App;