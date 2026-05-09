import { supabase } from "@/integrations/supabase/client";

export type MfaStatus = {
  enrolled: boolean;
  required: boolean;
  isAdmin: boolean;
  totp_enrolled: boolean;
  email_otp_enabled: boolean;
  preferred_method: "totp" | "email";
  recovery_codes_count: number;
};

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("mfa", {
    body: { action, ...payload },
  });
  if (error) {
    const message = await getFunctionErrorMessage(error);
    throw new Error(message);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback = (error as any)?.message ?? "Verification request failed";
  const ctx = (error as any)?.context;

  if (!ctx) return fallback;

  try {
    const response = typeof ctx.clone === "function" ? ctx.clone() : ctx;
    if (typeof response.text === "function") {
      const text = await response.text();
      if (!text) return fallback;
      try {
        const body = JSON.parse(text);
        return String(body?.error ?? body?.message ?? body?.code ?? text);
      } catch {
        return text;
      }
    }
  } catch {
    // Fall through to json() below for runtimes that expose only a parsed reader.
  }

  try {
    if (typeof ctx.json === "function") {
      const body = await ctx.json();
      return String(body?.error ?? body?.message ?? body?.code ?? fallback);
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export const mfaApi = {
  status: () => call<MfaStatus>("status"),
  sendEmailCode: (purpose: "login" | "enroll" = "login") =>
    call("send-email-code", { purpose }),
  verifyEmailCode: (code: string, purpose: "login" | "enroll" = "login") =>
    call<{ verified: boolean }>("verify-email-code", { code, purpose }),
  disableEmail: () => call("disable-email"),
  markTotpEnrolled: (enrolled: boolean) => call("mark-totp-enrolled", { enrolled }),
  setPreferred: (method: "totp" | "email") => call("set-preferred", { method }),
  generateRecoveryCodes: () => call<{ codes: string[] }>("generate-recovery-codes"),
  verifyRecoveryCode: (code: string) =>
    call<{ verified: boolean; remaining: number }>("verify-recovery-code", { code }),
};

/**
 * Returns true if the current AAL meets the user's enrollment level.
 * If a TOTP factor is verified, the user must reach AAL2; otherwise AAL1 is fine.
 */
export async function getAalGap() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { currentLevel: null, nextLevel: null, gap: false };
  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
    gap: data.currentLevel !== data.nextLevel,
  };
}
