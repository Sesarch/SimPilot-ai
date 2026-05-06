import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Smartphone, Mail, KeyRound, Check, AlertCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mfaApi, type MfaStatus } from "@/lib/mfa";

const MfaSettings = () => {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [busy, setBusy] = useState(false);

  // Email enroll flow
  const [emailEnrolling, setEmailEnrolling] = useState(false);
  const [emailCode, setEmailCode] = useState("");

  // TOTP enroll flow
  const [totpStage, setTotpStage] = useState<null | "qr" | "verify">(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  // Recovery codes
  const [newRecovery, setNewRecovery] = useState<string[] | null>(null);

  const refresh = async () => {
    try {
      setStatus(await mfaApi.status());
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => { refresh(); }, []);

  // ---- Email OTP ---------------------------------------------------------
  const startEmailEnroll = async () => {
    setBusy(true);
    try {
      await mfaApi.sendEmailCode("enroll");
      setEmailEnrolling(true);
      toast.success("Code sent — check your email");
    } catch (e: any) {
      toast.error(e?.message === "rate_limited" ? "Too many requests" : "Failed to send code");
    } finally { setBusy(false); }
  };

  const finishEmailEnroll = async () => {
    setBusy(true);
    try {
      await mfaApi.verifyEmailCode(emailCode, "enroll");
      toast.success("Email 2FA enabled");
      setEmailEnrolling(false);
      setEmailCode("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message === "incorrect_code" ? "Incorrect code" : "Verification failed");
    } finally { setBusy(false); }
  };

  const disableEmail = async () => {
    setBusy(true);
    try {
      await mfaApi.disableEmail();
      toast.success("Email 2FA disabled");
      await refresh();
    } finally { setBusy(false); }
  };

  // ---- TOTP --------------------------------------------------------------
  const startTotpEnroll = async () => {
    setBusy(true);
    try {
      // Clean any pre-existing unverified factor first
      const existing = await supabase.auth.mfa.listFactors();
      for (const f of existing.data?.totp ?? []) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setTotpFactorId(data.id);
      setTotpQr(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setTotpStage("qr");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start enrollment");
    } finally { setBusy(false); }
  };

  const finishTotpEnroll = async () => {
    if (!totpFactorId) return;
    setBusy(true);
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId: totpFactorId });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({
        factorId: totpFactorId, challengeId: ch.data.id, code: totpCode,
      });
      if (v.error) throw v.error;
      await mfaApi.markTotpEnrolled(true);
      toast.success("Authenticator enabled");
      setTotpStage(null);
      setTotpFactorId(null); setTotpQr(null); setTotpSecret(null); setTotpCode("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally { setBusy(false); }
  };

  const removeTotp = async () => {
    setBusy(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      for (const f of factors.data?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      await mfaApi.markTotpEnrolled(false);
      toast.success("Authenticator removed");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    } finally { setBusy(false); }
  };

  // ---- Recovery codes ----------------------------------------------------
  const generateRecovery = async () => {
    if (!confirm("Generate new recovery codes? Old ones will stop working.")) return;
    setBusy(true);
    try {
      const { codes } = await mfaApi.generateRecoveryCodes();
      setNewRecovery(codes);
      await refresh();
    } finally { setBusy(false); }
  };

  if (!status) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="font-display text-lg font-bold tracking-wide">Two-Factor Authentication</h2>
          <p className="text-sm text-muted-foreground">
            {status.isAdmin
              ? "Required for your admin account."
              : "Add a second step at sign-in to protect your account."}
          </p>
        </div>
      </div>

      {status.isAdmin && !status.enrolled && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <span>2FA enrollment is required to access the admin dashboard.</span>
        </div>
      )}

      {/* TOTP */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Authenticator app</p>
              <p className="text-xs text-muted-foreground">Google Authenticator, 1Password, Authy</p>
            </div>
          </div>
          {status.totp_enrolled ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary inline-flex items-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
              <button onClick={removeTotp} disabled={busy} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
            </div>
          ) : (
            <button onClick={startTotpEnroll} disabled={busy} className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground font-display tracking-wider uppercase disabled:opacity-50">
              Set up
            </button>
          )}
        </div>

        {totpStage === "qr" && totpQr && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Scan with your authenticator, then enter the 6-digit code:</p>
            <div className="bg-white p-3 inline-block rounded">
              <img src={totpQr} alt="TOTP QR" className="w-40 h-40" />
            </div>
            {totpSecret && (
              <p className="text-[11px] font-mono break-all text-muted-foreground">
                Secret: {totpSecret}
                <button onClick={() => navigator.clipboard.writeText(totpSecret)} className="ml-2 inline-flex items-center text-primary"><Copy className="w-3 h-3" /></button>
              </p>
            )}
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="flex-1 bg-secondary rounded px-3 py-2 text-sm font-mono tracking-widest"
              />
              <button onClick={finishTotpEnroll} disabled={busy || totpCode.length !== 6}
                className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">
                Verify
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email OTP */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Email codes</p>
              <p className="text-xs text-muted-foreground">6-digit code sent to your email</p>
            </div>
          </div>
          {status.email_otp_enabled ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary inline-flex items-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
              <button onClick={disableEmail} disabled={busy} className="text-xs text-muted-foreground hover:text-destructive">Disable</button>
            </div>
          ) : (
            <button onClick={startEmailEnroll} disabled={busy} className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground font-display tracking-wider uppercase disabled:opacity-50">
              Enable
            </button>
          )}
        </div>
        {emailEnrolling && (
          <div className="mt-4 flex gap-2">
            <input
              inputMode="numeric"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter code from email"
              className="flex-1 bg-secondary rounded px-3 py-2 text-sm font-mono tracking-widest"
            />
            <button onClick={finishEmailEnroll} disabled={busy || emailCode.length !== 6}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">
              Verify
            </button>
          </div>
        )}
      </div>

      {/* Recovery codes */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Recovery codes</p>
              <p className="text-xs text-muted-foreground">{status.recovery_codes_count} unused codes</p>
            </div>
          </div>
          <button onClick={generateRecovery} disabled={busy} className="text-xs px-3 py-1.5 rounded border border-border hover:border-primary disabled:opacity-50">
            {status.recovery_codes_count > 0 ? "Regenerate" : "Generate"}
          </button>
        </div>
        {newRecovery && (
          <div className="mt-4">
            <p className="text-xs text-destructive mb-2">Save these now — they won't be shown again.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {newRecovery.map((c) => (<div key={c} className="bg-secondary rounded px-2 py-1.5">{c}</div>))}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(newRecovery.join("\n")); toast.success("Copied"); }}
              className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy all
            </button>
            <button onClick={() => setNewRecovery(null)} className="ml-4 text-xs text-muted-foreground hover:text-foreground">
              I've saved them
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MfaSettings;
