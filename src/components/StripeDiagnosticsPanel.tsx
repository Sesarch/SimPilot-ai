import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type PriceInfo = {
  plan: string;
  id: string;
  ok: boolean;
  livemode?: boolean;
  nickname?: string | null;
  unit_amount?: number | null;
  currency?: string | null;
  product?: string | null;
  error?: string;
};

type Diagnostics = {
  mode: "live" | "test" | "unknown";
  key: { type: "secret" | "restricted"; fingerprint: string; prefix: string };
  account: {
    id?: string;
    country?: string;
    business_name?: string | null;
    support_email?: string | null;
    branding?: {
      icon: string | null;
      logo: string | null;
      primary_color: string | null;
      secondary_color: string | null;
    };
    charges_enabled?: boolean;
    livemode?: boolean | null;
    error?: string;
  };
  prices: PriceInfo[];
  checked_at: string;
};

/**
 * Admin-only diagnostic for the Stripe key currently powering Checkout.
 * Surfaces test/live mode, key fingerprint, account branding, and per-plan
 * price livemode so admins can spot a mismatched key or branding swap before
 * it lands in front of a paying customer.
 */
const StripeDiagnosticsPanel = () => {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        "admin-payments?action=diagnostics",
        { method: "GET" },
      );
      if (error) throw error;
      setData(res as Diagnostics);
    } catch (e: any) {
      setError(e?.message || "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-card/50 border border-border rounded-xl p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading Stripe diagnostics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-sm">
        <div className="flex items-center gap-2 text-destructive font-medium">
          <ShieldAlert className="w-4 h-4" /> Diagnostics unavailable
        </div>
        <p className="text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  const isLive = data.mode === "live";
  const modeBadge = (
    <Badge
      variant={isLive ? "default" : "secondary"}
      className={`uppercase tracking-wider text-[10px] ${
        isLive ? "bg-destructive text-destructive-foreground" : ""
      }`}
    >
      {data.mode}
    </Badge>
  );

  // Flag any price whose livemode disagrees with the key's mode.
  const mismatched = data.prices.filter(
    (p) => p.ok && typeof p.livemode === "boolean" && p.livemode !== isLive,
  );
  const broken = data.prices.filter((p) => !p.ok);
  const accountLivemodeMismatch =
    typeof data.account.livemode === "boolean" && data.account.livemode !== isLive;

  return (
    <div className="bg-card/50 border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm">Stripe Checkout Diagnostics</h3>
          {modeBadge}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          className="text-xs h-7 gap-1.5"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Top-level mismatch banner */}
      {(mismatched.length > 0 || broken.length > 0 || accountLivemodeMismatch) && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {accountLivemodeMismatch && (
              <p>
                Account livemode disagrees with key mode — branding may be wrong.
              </p>
            )}
            {mismatched.length > 0 && (
              <p>
                {mismatched.length} price ID(s) live/test mismatch:{" "}
                {mismatched.map((p) => p.plan).join(", ")}
              </p>
            )}
            {broken.length > 0 && (
              <p>
                {broken.length} price ID(s) failed to resolve:{" "}
                {broken.map((p) => p.plan).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Key + account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Secret key in use
          </div>
          <div className="font-mono text-sm text-foreground">
            {data.key.fingerprint}
          </div>
          <div className="text-muted-foreground">
            Type: <span className="text-foreground capitalize">{data.key.type}</span>{" "}
            · Prefix: <span className="font-mono">{data.key.prefix}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Stripe account (drives Checkout branding)
          </div>
          {data.account.error ? (
            <div className="text-destructive">{data.account.error}</div>
          ) : (
            <>
              <div className="text-foreground">
                {data.account.business_name || "(no display name set)"}
              </div>
              <div className="text-muted-foreground font-mono">
                {data.account.id}
                {data.account.country ? ` · ${data.account.country}` : ""}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {data.account.branding?.icon && (
                  <img
                    src={`https://files.stripe.com/links/${data.account.branding.icon}`}
                    alt="Stripe branding icon"
                    className="w-6 h-6 rounded bg-background border border-border object-contain"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
                {data.account.branding?.primary_color && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm border border-border"
                      style={{ background: data.account.branding.primary_color }}
                    />
                    <span className="font-mono">
                      {data.account.branding.primary_color}
                    </span>
                  </span>
                )}
                <span
                  className={`flex items-center gap-1 ${
                    data.account.charges_enabled ? "text-green-500" : "text-amber-500"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {data.account.charges_enabled ? "Charges enabled" : "Charges disabled"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prices */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Plan price IDs
        </div>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-2">Plan</th>
                <th className="text-left p-2">Price ID</th>
                <th className="text-left p-2">Mode</th>
                <th className="text-right p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.prices.map((p) => {
                const mismatch =
                  p.ok && typeof p.livemode === "boolean" && p.livemode !== isLive;
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-border/50 ${
                      mismatch || !p.ok ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="p-2 capitalize text-foreground">{p.plan}</td>
                    <td className="p-2 font-mono text-muted-foreground">{p.id}</td>
                    <td className="p-2">
                      {!p.ok ? (
                        <span className="text-destructive">{p.error || "error"}</span>
                      ) : (
                        <span
                          className={
                            mismatch ? "text-amber-500 font-medium" : "text-muted-foreground"
                          }
                        >
                          {p.livemode ? "live" : "test"}
                          {mismatch ? " ⚠ mismatch" : ""}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">
                      {p.ok && p.unit_amount != null
                        ? `${(p.unit_amount / 100).toFixed(2)} ${p.currency?.toUpperCase() || ""}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground">
        Checked {new Date(data.checked_at).toLocaleString()}
      </div>
    </div>
  );
};

export default StripeDiagnosticsPanel;
