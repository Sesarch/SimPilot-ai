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
    (async () => {
      try {
        const status = await mfaApi.status();
        const mustEnforce = requireMfa || status.required;

        // 1. If a TOTP factor is verified, ensure session AAL is aal2.
        const aal = await getAalGap();
        if (status.totp_enrolled && aal.gap) {
          navigate("/mfa", { state: { redirectTo: location.pathname }, replace: true });
          return;
        }

        // 2. If MFA enforced (admin) and not enrolled at all → keep them in the
        //    admin flow and enroll email 2FA through the challenge screen.
        if (mustEnforce && !status.enrolled) {
          const { data: { session } } = await supabase.auth.getSession();
          const flagKey = `mfa-verified:${session?.access_token?.slice(-12) ?? ""}`;
          navigate("/mfa", {
            state: { redirectTo: location.pathname, sessionFlag: flagKey, enrollEmail: true },
            replace: true,
          });
          return;
        }

        // 3. If enforced and enrolled via email-only, require email-OTP step on
        //    fresh sessions. We use a session-storage flag.
        if (mustEnforce && status.enrolled && !status.totp_enrolled && status.email_otp_enabled) {
          const { data: { session } } = await supabase.auth.getSession();
          const flagKey = `mfa-verified:${session?.access_token?.slice(-12) ?? ""}`;
          if (!sessionStorage.getItem(flagKey)) {
            navigate("/mfa", { state: { redirectTo: location.pathname, sessionFlag: flagKey }, replace: true });
            return;
          }
        }

        setReady(true);
      } catch (e) {
        console.error("MfaGate error", e);
        setReady(true);
      }
    })();
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
