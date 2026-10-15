import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8002/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const signupUser = async (userData) => {
  const response = await api.post(
    "/accounts/signup/",
    userData
  );

  return response.data;
};

export default api;