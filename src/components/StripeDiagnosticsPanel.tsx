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
  XCircle,
  ExternalLink,
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

type ScopeResult = { ok: boolean; error?: string };

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
  scopes?: {
    prices_read: ScopeResult;
    products_read: ScopeResult;
    account_read: ScopeResult;
    branding_set: ScopeResult;
    charges_enabled: ScopeResult;
    customers_read: ScopeResult;
    subscriptions_read: ScopeResult;
  };
  checked_at: string;
};

const CHECKLIST: Array<{
  key: keyof NonNullable<Diagnostics["scopes"]>;
  label: string;
  hint: string;
  fix: string;
  required: boolean;
}> = [
  {
    key: "prices_read",
    label: "Prices read",
    hint: "Resolves Student / Pro / Ultra price IDs at checkout.",
    fix: "Grant Prices → read on the restricted key (rak_prices_read).",
    required: true,
  },
  {
    key: "products_read",
    label: "Products read",
    hint: "Reads product metadata (features, tagline, badge) for the pricing UI.",
    fix: "Grant Products → read on the restricted key (rak_products_read).",
    required: true,
  },
  {
    key: "customers_read",
    label: "Customers read",
    hint: "Looks up the Stripe customer record by email before checkout.",
    fix: "Grant Customers → read on the restricted key (rak_customers_read).",
    required: true,
  },
  {
    key: "subscriptions_read",
    label: "Subscriptions read",
    hint: "Powers check-subscription so the app knows who's on Pro/Ultra.",
    fix: "Grant Subscriptions → read on the restricted key (rak_subscriptions_read).",
    required: true,
  },
  {
    key: "account_read",
    label: "Account read",
    hint: "Reads your account so we can show the branding driving Checkout.",
    fix: "Grant Account → read on the restricted key (rak_accounts_kyc_basic_read).",
    required: false,
  },
  {
    key: "branding_set",
    label: "Branding configured",
    hint: "Logo, icon and brand color shown to customers on Checkout.",
    fix: "Stripe → Settings → Branding: upload a logo/icon and pick a primary color.",
    required: false,
  },
  {
    key: "charges_enabled",
    label: "Charges enabled",
    hint: "Required for the account to actually accept live payments.",
    fix: "Complete Stripe account verification (Settings → Account details).",
    required: true,
  },
];

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

  // Connection status: can we read the account + does it have branding configured?
  const acctErr = data.account.error;
  const acctPermMissing = !!acctErr && /accounts_kyc_basic_read|required permissions/i.test(acctErr);
  const hasBranding = !!(
    data.account.branding?.icon ||
    data.account.branding?.logo ||
    data.account.branding?.primary_color
  );
  const connection: {
    tone: "ok" | "warn" | "error";
    label: string;
    detail: string;
  } = acctErr
    ? acctPermMissing
      ? {
          tone: "warn",
          label: "Account read blocked",
          detail:
            "Key works for checkout, but lacks Account read scope so branding can't be verified.",
        }
      : { tone: "error", label: "Account unreachable", detail: acctErr }
    : !data.account.charges_enabled
      ? {
          tone: "warn",
          label: "Connected — charges disabled",
          detail: `${data.account.business_name ?? data.account.id} · finish Stripe verification to accept live payments.`,
        }
      : !hasBranding
        ? {
            tone: "warn",
            label: "Connected — no branding",
            detail: `${data.account.business_name ?? data.account.id} · upload a logo and brand color in Stripe → Branding.`,
          }
        : {
            tone: "ok",
            label: "Account connected",
            detail: `${data.account.business_name ?? data.account.id}${data.account.country ? ` · ${data.account.country}` : ""} · logo and brand color visible to checkout.`,
          };

  const connectionStyles =
    connection.tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : connection.tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-destructive/40 bg-destructive/10 text-destructive";

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

      {/* Account connection status */}
      <div className={`rounded-lg border px-3 py-2.5 flex items-start gap-3 ${connectionStyles}`}>
        {connection.tone === "ok" ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        ) : connection.tone === "warn" ? (
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{connection.label}</span>
            {data.account.id && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {data.account.id}
              </span>
            )}
            {connection.tone === "ok" && data.account.branding?.primary_color && (
              <span
                className="w-3 h-3 rounded-sm border border-border"
                style={{ background: data.account.branding.primary_color }}
                title={data.account.branding.primary_color}
              />
            )}
            {connection.tone === "ok" && data.account.branding?.icon && (
              <img
                src={`https://files.stripe.com/links/${data.account.branding.icon}`}
                alt=""
                className="w-4 h-4 rounded-sm bg-background border border-border object-contain"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
            {connection.detail}
          </p>
        </div>
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

      {/* Onboarding checklist — verifies each restricted-key scope */}
      {data.scopes && (() => {
        const items = CHECKLIST.map((c) => ({ ...c, result: data.scopes![c.key] }));
        const failing = items.filter((i) => !i.result.ok);
        const requiredFailing = failing.filter((i) => i.required);
        const allGreen = failing.length === 0;
        return (
          <div className="rounded-xl border border-border/60 bg-background/30 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-2">
                <h4 className="font-display text-xs tracking-wider uppercase text-foreground">
                  Stripe Key Checklist
                </h4>
                {allGreen ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">
                    All systems go
                  </Badge>
                ) : requiredFailing.length > 0 ? (
                  <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">
                    {requiredFailing.length} required missing
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">
                    {failing.length} optional missing
                  </Badge>
                )}
              </div>
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
              >
                Open API keys <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ul className="divide-y divide-border/40">
              {items.map((item) => (
                <li key={item.key} className="px-4 py-2.5 flex items-start gap-3">
                  {item.result.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : item.required ? (
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-foreground">{item.label}</span>
                      {!item.required && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          optional
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</p>
                    {!item.result.ok && (
                      <p className="text-[11px] text-amber-400/90 mt-1">
                        <span className="font-medium">Fix:</span> {item.fix}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

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
            /accounts_kyc_basic_read|required permissions/i.test(data.account.error) ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed">
                <div className="flex items-center gap-1.5 text-amber-500 font-medium mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Account read permission missing
                </div>
                <p className="text-muted-foreground">
                  This restricted key can resolve prices but can't read your Stripe account
                  details (business name, logo, brand color). Checkout still works — only the
                  branding preview here is unavailable.
                </p>
                <p className="text-muted-foreground mt-1.5">
                  To enable it: Stripe Dashboard → Developers → API keys → edit this restricted
                  key → grant <span className="font-mono text-foreground">Account</span> read
                  access (<span className="font-mono">rak_accounts_kyc_basic_read</span>).
                </p>
              </div>
            ) : (
              <div className="text-destructive text-xs break-words">{data.account.error}</div>
            )
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
