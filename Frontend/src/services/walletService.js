import { getMyReferrals } from "./referralService";

const STORAGE_KEY_PREFIX = "corvun_wallet_ledger_";
const WALLET_EVENT = "corvun_wallet_updated";

/**
 * Format currency in Indian Rupees (INR)
 */
export const formatCurrency = (amount = 0) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Default starter ledger data for newly initialized user workstations
 */
const getDefaultLedger = (userId) => {
  return {
    userId: userId || "user",
    balance: 4850.0,
    pendingCashback: 350.0,
    rewardPoints: 120,
    transactions: [
      {
        id: "TXN-CRV-984210",
        type: "credit",
        category: "topup",
        title: "Instant Wallet Top-Up",
        description: "Funds loaded via UPI (Google Pay / Verified Node)",
        amount: 2500.0,
        balanceAfter: 4850.0,
        status: "completed",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: "UPI",
        reference: "UPI/3948210984/CRV",
      },
      {
        id: "TXN-CRV-984102",
        type: "credit",
        category: "referral",
        title: "Referral Commission Reward",
        description: "Hardware referral bonus credited for Rig Purchase",
        amount: 1500.0,
        balanceAfter: 2350.0,
        status: "completed",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: "Referral Node",
        reference: "REF-BONUS-CRV89",
      },
      {
        id: "TXN-CRV-983995",
        type: "debit",
        category: "order",
        title: "Checkout Partial Debit",
        description: "Applied credits towards Custom GPU Bracket & Cables",
        amount: 650.0,
        balanceAfter: 850.0,
        status: "completed",
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: "Corvun Wallet",
        reference: "ORD-CRV-33546",
      },
      {
        id: "TXN-CRV-983501",
        type: "credit",
        category: "cashback",
        title: "Workstation Welcome Cashback",
        description: "Special enthusiast activation bonus",
        amount: 1500.0,
        balanceAfter: 1500.0,
        status: "completed",
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: "Promo Allocation",
        reference: "PROMO-WELCOME-CRV",
      },
    ],
  };
};

/**
 * Get current wallet state for a user
 */
export const getWalletData = (user) => {
  const userId = user?.id || user?.email || "default_user";
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure recalculation of balance from transactions if present
      if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Corvun Wallet: Error parsing storage ledger", err);
  }

  // Generate and save default ledger
  const defaultData = getDefaultLedger(userId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(defaultData));
  } catch (e) {
    console.error("Corvun Wallet: Failed to persist default ledger", e);
  }

  return defaultData;
};

/**
 * Synchronize live referral rewards into wallet if available
 */
export const syncReferralEarnings = async (user) => {
  if (!user) return getWalletData(null);

  try {
    const res = await getMyReferrals();
    const referrals = Array.isArray(res?.referrals) ? res.referrals : [];
    const completedRewards = referrals
      .filter((r) => r.status?.toLowerCase() === "completed")
      .reduce((acc, curr) => acc + (Number(curr.reward_amount) || 0), 0);

    if (completedRewards > 0) {
      const current = getWalletData(user);
      // Check if already accounted
      const existingRefTotal = current.transactions
        .filter((t) => t.category === "backend_referral")
        .reduce((sum, t) => sum + t.amount, 0);

      const delta = completedRewards - existingRefTotal;
      if (delta > 0) {
        return addFunds(user, delta, "Referral System", "Verified Referral Reward Payout", "backend_referral");
      }
    }
  } catch (err) {
    // Non-fatal if offline or unauthenticated
    console.debug("Corvun Wallet: Referral sync skipped", err);
  }

  return getWalletData(user);
};

/**
 * Add funds (Top-Up or Credit)
 */
export const addFunds = (user, amount, method = "UPI", note = "Instant Top-Up", category = "topup") => {
  const userId = user?.id || user?.email || "default_user";
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const current = getWalletData(user);

  const numAmount = Math.max(0, Number(amount) || 0);
  const newBalance = current.balance + numAmount;

  const newTxn = {
    id: `TXN-CRV-${Math.floor(100000 + Math.random() * 900000)}`,
    type: "credit",
    category,
    title: category === "topup" ? "Instant Wallet Top-Up" : "System Credit Allocation",
    description: note || `Credited via ${method}`,
    amount: numAmount,
    balanceAfter: newBalance,
    status: "completed",
    date: new Date().toISOString(),
    paymentMethod: method,
    reference: `TXN-${Date.now().toString(36).toUpperCase()}`,
  };

  const updatedLedger = {
    ...current,
    balance: newBalance,
    transactions: [newTxn, ...current.transactions],
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedLedger));
  } catch (err) {
    console.error("Corvun Wallet: Failed to persist funds addition", err);
  }

  // Dispatch broadcast event for live reactive UI
  window.dispatchEvent(
    new CustomEvent(WALLET_EVENT, {
      detail: { userId, balance: newBalance, ledger: updatedLedger },
    })
  );

  return updatedLedger;
};

/**
 * Deduct funds (Order Checkout or Debit)
 */
export const deductFunds = (user, amount, orderRef = "ORDER") => {
  const userId = user?.id || user?.email || "default_user";
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const current = getWalletData(user);

  const numAmount = Math.max(0, Number(amount) || 0);
  if (current.balance < numAmount) {
    throw new Error("Insufficient wallet balance for this transaction.");
  }

  const newBalance = current.balance - numAmount;
  const newTxn = {
    id: `TXN-CRV-${Math.floor(100000 + Math.random() * 900000)}`,
    type: "debit",
    category: "order",
    title: "Order Payment Debit",
    description: `Dispatched to order #${orderRef}`,
    amount: numAmount,
    balanceAfter: newBalance,
    status: "completed",
    date: new Date().toISOString(),
    paymentMethod: "Corvun Wallet",
    reference: `ORD-${orderRef}`,
  };

  const updatedLedger = {
    ...current,
    balance: newBalance,
    transactions: [newTxn, ...current.transactions],
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedLedger));
  } catch (err) {
    console.error("Corvun Wallet: Failed to persist debit", err);
  }

  window.dispatchEvent(
    new CustomEvent(WALLET_EVENT, {
      detail: { userId, balance: newBalance, ledger: updatedLedger },
    })
  );

  return updatedLedger;
};

/**
 * Subscribe to live wallet balance changes across components
 */
export const subscribeWallet = (callback) => {
  const handler = (e) => {
    if (callback) callback(e.detail);
  };
  window.addEventListener(WALLET_EVENT, handler);
  return () => window.removeEventListener(WALLET_EVENT, handler);
};
