import api from "./api";

/**
 * Fetch referrals for the authenticated user.
 * GET /api/referrals/my-referrals/
 * Returns: { referrals: [ { id, referral_code, status, reward_amount, referee_name, date, ... } ] }
 */
export const getMyReferrals = async () => {
  const response = await api.get("/referrals/my-referrals/");
  return response.data;
};

/**
 * Claim or register a referral using another user's referral code.
 * POST /api/referrals/create/
 * Request body: { referral_code: string }
 */
export const claimReferralCode = async (referralCode) => {
  const response = await api.post("/referrals/create/", {
    referral_code: referralCode,
  });
  return response.data;
};
