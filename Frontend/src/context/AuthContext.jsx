import { createContext, useContext, useState, useEffect } from "react";
import { getUserProfile, logoutUser } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on application mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profileData = await getUserProfile();
        setUser(profileData);
      } catch (error) {
        console.error("Session verification failed:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Set tokens and fetch user profile
  const login = async (authData) => {
    if (authData.access) {
      localStorage.setItem("access_token", authData.access);
    }
    if (authData.refresh) {
      localStorage.setItem("refresh_token", authData.refresh);
    }

    try {
      const profile = await getUserProfile();
      setUser(profile);
      return profile;
    } catch (error) {
      console.error("Profile fetch error after login:", error);
      return null;
    }
  };

  // Logout user and clear tokens
  const logout = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch (err) {
        console.warn("Logout API notice:", err);
      }
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
