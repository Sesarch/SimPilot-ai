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
    // supabase.functions.invoke throws a FunctionsHttpError on non-2xx and only
    // surfaces a generic "Edge Function returned a non-2xx status code" message.
    // Parse the response body so the real error code (e.g. "incorrect_code",
    // "no_active_code", "rate_limited") reaches the caller.
    try {
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) throw new Error(String(body.error));
      } else if (ctx && typeof ctx.text === "function") {
        const txt = await ctx.text();
        try {
          const parsed = JSON.parse(txt);
          if (parsed?.error) throw new Error(String(parsed.error));
        } catch {
          if (txt) throw new Error(txt);
        }
      }
    } catch (parsed) {
      if (parsed instanceof Error) throw parsed;
    }
    throw error;
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
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
