import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mfaApi, getAalGap } from "@/lib/mfa";
import SEOHead from "@/components/SEOHead";
import { Shield, Mail, Smartphone, KeyRound } from "lucide-react";

type Mode = "totp" | "email" | "recovery";

const MfaChallengePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as any)?.redirectTo &&
    typeof (location.state as any).redirectTo === "string"
      ? (location.state as any).redirectTo
      : "/dashboard";
  const sessionFlag: string | undefined = (location.state as any)?.sessionFlag;
  const enrollEmail = (location.state as any)?.enrollEmail === true;

  const [status, setStatus] = useState<Awaited<ReturnType<typeof mfaApi.status>> | null>(null);
  const [mode, setMode] = useState<Mode>("email");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const sentOnce = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      const s = await mfaApi.status();
      setStatus(s);
      // Choose default mode: TOTP if enrolled, else email
      if (s.totp_enrolled) setMode("totp");
      else setMode("email");

        // If an admin has not enrolled MFA yet, enroll email verification here
        // so they stay in the Super Admin access flow instead of landing in Account.
      const aal = await getAalGap();
        if (s.required && !s.enrolled && enrollEmail) {
          setMode("email");
          return;
        }

        // If a TOTP factor exists in Supabase but AAL is already met, no challenge needed
      if (!s.required && !s.enrolled) {
        // Not enrolled and not required — straight through
        navigate(redirectTo, { replace: true });
        return;
      }
      if (s.totp_enrolled && !aal.gap) {
        // Already at correct AAL — done
        navigate(redirectTo, { replace: true });
      }
    })();
  }, [user, authLoading, navigate, redirectTo]);

  const sendEmail = async () => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    setBusy(true);
    try {
      await mfaApi.sendEmailCode(enrollEmail ? "enroll" : "login");
      setEmailSent(true);
      toast.success("Code sent — check your email");
    } catch (e: any) {
      toast.error(e?.message === "rate_limited" ? "Too many requests. Wait a minute." : "Failed to send code");
      sentOnce.current = false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (mode === "email" && status && !emailSent) sendEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "totp") {
        // Use Supabase native TOTP challenge/verify
        const factors = await supabase.auth.mfa.listFactors();
        const factor = factors.data?.totp?.find((f) => f.status === "verified");
        if (!factor) throw new Error("No verified authenticator found");
        const ch = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (ch.error) throw ch.error;
        const v = await supabase.auth.mfa.verify({
          factorId: factor.id,
          challengeId: ch.data.id,
          code,
        });
        if (v.error) throw v.error;
        toast.success("Verified");
        navigate(redirectTo, { replace: true });
      } else if (mode === "email") {
        await mfaApi.verifyEmailCode(code, enrollEmail ? "enroll" : "login");
        if (sessionFlag) sessionStorage.setItem(sessionFlag, "1");
        toast.success("Verified");
        navigate(redirectTo, { replace: true });
      } else {
        await mfaApi.verifyRecoveryCode(recovery);
        toast.success("Recovery code accepted. Please re-enroll a method in Account.");
        navigate("/account", { replace: true });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Verification failed";
      toast.error(
        msg === "incorrect_code" ? "Incorrect code"
          : msg === "no_active_code" ? "Code expired — request a new one"
          : msg === "too_many_attempts" ? "Too many attempts"
          : msg
      );
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEOHead title="Two-factor verification — SimPilot.AI" description="Verify your identity." keywords="2fa, mfa, verification" canonical="/mfa" noIndex />
      <div className="w-full max-w-md">
        <div className="bg-gradient-card rounded-xl border border-border p-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl tracking-wide">Two-factor verification</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {status.required ? "Required for admin access. " : ""}
            Enter the 6-digit code to continue.
          </p>

          <div className="flex gap-2 mb-5 text-xs">
            {status.totp_enrolled && (
              <button
                onClick={() => setMode("totp")}
                className={`flex-1 py-2 rounded border ${mode === "totp" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                <Smartphone className="w-3.5 h-3.5 inline mr-1" /> Authenticator
              </button>
            )}
            {status.email_otp_enabled && (
              <button
                onClick={() => setMode("email")}
                className={`flex-1 py-2 rounded border ${mode === "email" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                <Mail className="w-3.5 h-3.5 inline mr-1" /> Email
              </button>
            )}
            <button
              onClick={() => setMode("recovery")}
              className={`flex-1 py-2 rounded border ${mode === "recovery" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              <KeyRound className="w-3.5 h-3.5 inline mr-1" /> Recovery
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "recovery" ? (
              <input
                type="text"
                value={recovery}
                onChange={(e) => setRecovery(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                maxLength={11}
                className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm tracking-widest font-mono outline-none focus:ring-1 focus:ring-primary/50"
                required
                autoFocus
              />
            ) : (
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-secondary rounded-lg px-4 py-2.5 text-center text-lg tracking-[0.5em] font-mono outline-none focus:ring-1 focus:ring-primary/50"
                required
                autoFocus
              />
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-primary text-primary-foreground font-display text-sm tracking-widest uppercase rounded-lg disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>

          {mode === "email" && (
            <button
              onClick={() => { sentOnce.current = false; sendEmail(); }}
              disabled={busy}
              className="mt-4 text-xs text-primary hover:underline w-full text-center"
            >
              Resend code
            </button>
          )}

          <button
            onClick={async () => { await signOut(); navigate("/auth", { replace: true }); }}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground w-full text-center"
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default MfaChallengePage;
