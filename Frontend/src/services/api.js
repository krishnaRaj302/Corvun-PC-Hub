import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8002/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const signupUser = async (userData) => {
  const response = await api.post(
    "/accounts/signup/",
    userData
  );

  return response.data;
};

export default api;