// Shared plan-label calculation used outside the Admin Users tab.
// Single source of truth so Trial / Paid / Free is consistent across the app.

export type PlanCategory = "paid" | "trial" | "free";

export interface PlanLabelInput {
  /** Stripe subscribed flag from check-subscription (active or trialing on a paid price). */
  subscribed?: boolean | null;
  /** Canonical tier from Stripe price match (e.g. "pro", "ultra", "student"). */
  tier?: string | null;
  /** Profile trial end date (ISO string or Date). */
  trialEndsAt?: string | Date | null;
}

export interface PlanLabelResult {
  category: PlanCategory;
  /** Short label, e.g. "SimPilot Pro", "Trial · 3d left", "Free". */
  label: string;
  /** True when the user is on an active 7-day trial (not paid). */
  trialActive: boolean;
  trialDaysLeft: number;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function calculatePlanLabel(input: PlanLabelInput): PlanLabelResult {
  const { subscribed, tier, trialEndsAt } = input;

  // 1. Paid wins
  if (subscribed) {
    const label = tier ? `SimPilot ${titleCase(tier)}` : "SimPilot";
    return { category: "paid", label, trialActive: false, trialDaysLeft: 0 };
  }

  // 2. Trial (only when not paid)
  if (trialEndsAt) {
    const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
    const ms = end.getTime() - Date.now();
    if (Number.isFinite(ms) && ms > 0) {
      const daysLeft = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      return {
        category: "trial",
        label: `Trial · ${daysLeft}d left`,
        trialActive: true,
        trialDaysLeft: daysLeft,
      };
    }
  }

  // 3. Otherwise Free
  return { category: "free", label: "Free", trialActive: false, trialDaysLeft: 0 };
}
