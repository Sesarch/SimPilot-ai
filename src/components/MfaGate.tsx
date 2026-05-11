import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { mfaApi, getAalGap } from "@/lib/mfa";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wraps any route that requires the user to have completed their MFA challenge
 * for the current session. If the user is an admin without 2FA enrolled, they
 * are redirected to /account#security to enroll. If a TOTP factor exists but
 * the session AAL is still aal1, they are sent to /mfa to step up.
 */
const MfaGate = ({ children, requireMfa = false }: { children: ReactNode; requireMfa?: boolean }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { state: { redirectTo: location.pathname } });
      return;
    }

    let cancelled = false;
    // Safety net: never let the gate spin forever. If the MFA status
    // edge function hangs (cold start, network drop, JWKS lag), unblock
    // after 8s so the route can render and surface its own error UI
    // instead of an infinite "Loading…" screen.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn("MfaGate: status check timed out — releasing gate");
        setReady(true);
      }
    }, 8000);

    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
        ),
      ]);

    (async () => {
      try {
        const status = await withTimeout(mfaApi.status(), 6000, "mfa.status");
        if (cancelled) return;
        const mustEnforce = requireMfa || status.required;

        const aal = await withTimeout(getAalGap(), 4000, "getAalGap");
        if (cancelled) return;
        if (status.totp_enrolled && aal.gap) {
          navigate("/mfa", { state: { redirectTo: location.pathname }, replace: true });
          return;
        }

        if (mustEnforce && !status.enrolled) {
          const { data: { session } } = await supabase.auth.getSession();
          const flagKey = `mfa-verified:${session?.access_token?.slice(-12) ?? ""}`;
          navigate("/mfa", {
            state: { redirectTo: location.pathname, sessionFlag: flagKey, enrollEmail: true },
            replace: true,
          });
          return;
        }

        if (mustEnforce && status.enrolled && !status.totp_enrolled && status.email_otp_enabled) {
          const { data: { session } } = await supabase.auth.getSession();
          const flagKey = `mfa-verified:${session?.access_token?.slice(-12) ?? ""}`;
          if (!sessionStorage.getItem(flagKey)) {
            navigate("/mfa", { state: { redirectTo: location.pathname, sessionFlag: flagKey }, replace: true });
            return;
          }
        }

        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("MfaGate error", e);
        if (!cancelled) setReady(true);
      } finally {
        clearTimeout(safetyTimer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [user, loading, navigate, location.pathname, requireMfa]);

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  return <>{children}</>;
};

export default MfaGate;
