import api from "./api";
// LOGIN

export const loginUser = async (email, password) => {
  const response = await api.post("/accounts/login/", {
    email,
    password,
  });

  return response.data;
};

// SIGNUP OTP

export const verifyOtp = async (email, otp) => {
  const response = await api.post("/accounts/verify-otp/", {
    email,
    otp,
  });

  return response.data;
};

// FORGOT PASSWORD

export const forgotPassword = async (email) => {
  const response = await api.post(
    "/accounts/forgot-password/",
    {
      email,
    }
  );

  return response.data;
};

// PASSWORD RESET OTP
export const verifyResetOtp = async (email, otp) => {
  const response = await api.post(
    "/accounts/verify-reset-otp/",
    {
      email,
      otp,
    }
  );

  return response.data;
};

// RESET PASSWORD

export const resetPassword = async (
  email,
  password,
  confirmPassword
) => {
  const response = await api.post(
    "/accounts/reset-password/",
    {
      email,
      new_password: password,
      confirm_password: confirmPassword,
    }
  );

  return response.data;
};

// USER PROFILE
export const getUserProfile = async () => {
  const response = await api.get("/accounts/profile/");
  return response.data;
};

// LOGOUT
export const logoutUser = async (refreshToken) => {
  const response = await api.post("/accounts/logout/", {
    refresh: refreshToken,
  });
  return response.data;
};