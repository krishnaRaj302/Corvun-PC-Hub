import axios from "axios";

/**
 * Corvun Central API Client
 * Configured with baseURL (empty by default to leverage Vite proxy, or environment variable)
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("corvun_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent response parsing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Login Authentication API
 * Endpoint: POST /api/accounts/login/
 * @param {Object} credentials - { email, password }
 */
export const loginUser = async (credentials) => {
  const response = await api.post("/api/accounts/login/", credentials);
  return response.data;
};

/**
 * Signup Registration API
 * Endpoint: POST /api/accounts/signup/
 * @param {Object} userData - { full_name, email, password, confirm_password, terms_accepted }
 */
export const signupUser = async (userData) => {
  const response = await api.post("/api/accounts/signup/", userData);
  return response.data;
};

export default api;
