import api from "./api";

export const loginUser = async (email, password) => {
  const response = await api.post("/accounts/login/", {
    email,
    password,
  });

  return response.data;
};