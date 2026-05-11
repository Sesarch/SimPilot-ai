import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Mismatch = {
  kind: "missing_in_profile" | "missing_in_stripe" | "tier_mismatch" | "status_mismatch" | "no_email";
  email: string | null;
  user_id: string | null;
  profile_tier: string | null;
  profile_status: string | null;
  stripe_tier: string | null;
  stripe_status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

type AuditResult = {
  checked_at: string;
  summary: {
    stripe_live_subscriptions: number;
    profiles_with_email: number;
    mismatches: number;
    by_kind: Record<string, number>;
  };
  mismatches: Mismatch[];
};

const KIND_LABEL: Record<Mismatch["kind"], { text: string; variant: "default" | "secondary" | "destructive" }> = {
  missing_in_profile: { text: "Missing in profile", variant: "destructive" },
  missing_in_stripe: { text: "Missing in Stripe", variant: "destructive" },
  tier_mismatch: { text: "Tier mismatch", variant: "default" },
  status_mismatch: { text: "Status mismatch", variant: "secondary" },
  no_email: { text: "Stripe customer no email", variant: "secondary" },
};

const SubscriptionAuditPanel = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payments?action=subscription-audit`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as AuditResult;
      setResult(data);
      toast.success(
        data.summary.mismatches === 0
          ? "Audit clean — Stripe matches profiles."
          : `Audit found ${data.summary.mismatches} mismatch(es).`,
      );
    } catch (e: any) {
      toast.error(e.message || "Audit failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="bg-card/50 border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Subscription Audit
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Compares live Stripe subscriptions against <code>profiles.subscription_tier/status</code> and reports mismatches.
          </p>
        </div>
        <Button size="sm" onClick={runAudit} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Running…" : result ? "Re-run audit" : "Run audit"}
        </Button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Stripe live subs" value={result.summary.stripe_live_subscriptions} />
            <Stat label="Profiles scanned" value={result.summary.profiles_with_email} />
            <Stat label="Mismatches" value={result.summary.mismatches}
              accent={result.summary.mismatches === 0 ? "ok" : "warn"} />
            <Stat label="Checked" value={new Date(result.checked_at).toLocaleTimeString()} />
          </div>

          {result.summary.mismatches === 0 ? (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>All live Stripe subscriptions match profile data.</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(result.summary.by_kind).map(([k, v]) => (
                  <Badge key={k} variant={KIND_LABEL[k as Mismatch["kind"]]?.variant || "secondary"}>
                    {KIND_LABEL[k as Mismatch["kind"]]?.text || k}: {v}
                  </Badge>
                ))}
              </div>
              <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Drift detected. Most cases resolve by re-running the Stripe webhook or syncing manually.</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Kind</th>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Profile tier / status</th>
                        <th className="text-left p-3">Stripe tier / status</th>
                        <th className="text-left p-3">Stripe IDs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.mismatches.map((m, i) => {
                        const label = KIND_LABEL[m.kind] || { text: m.kind, variant: "secondary" as const };
                        return (
                          <tr key={i} className="border-t border-border/50 hover:bg-muted/10">
                            <td className="p-3"><Badge variant={label.variant} className="text-xs">{label.text}</Badge></td>
                            <td className="p-3 text-xs">{m.email || <span className="text-muted-foreground">—</span>}</td>
                            <td className="p-3 text-xs">
                              <span className="font-mono">{m.profile_tier || "—"}</span>
                              <span className="text-muted-foreground"> / {m.profile_status || "—"}</span>
                            </td>
                            <td className="p-3 text-xs">
                              <span className="font-mono">{m.stripe_tier || "—"}</span>
                              <span className="text-muted-foreground"> / {m.stripe_status || "—"}</span>
                            </td>
                            <td className="p-3 text-xs font-mono text-muted-foreground">
                              {m.stripe_subscription_id ? <div>{m.stripe_subscription_id.slice(0, 22)}…</div> : null}
                              {m.stripe_customer_id ? <div>{m.stripe_customer_id}</div> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "ok" | "warn" }) => (
  <div
    className={`rounded-lg border p-3 ${
      accent === "warn"
        ? "border-amber-500/40 bg-amber-500/5"
        : accent === "ok"
        ? "border-green-500/40 bg-green-500/5"
        : "border-border bg-card/30"
    }`}
  >
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-lg font-display">{value}</div>
  </div>
);

export default SubscriptionAuditPanel;
