import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw, Webhook, XCircle } from "lucide-react";

type Endpoint = {
  id: string;
  url: string;
  status: string;
  enabled_events: string[];
  api_version: string | null;
  livemode: boolean;
  matches_expected: boolean;
};

type RecentEvent = {
  stripe_event_id: string;
  event_type: string;
  livemode: boolean | null;
  status: string | null;
  user_id: string | null;
  customer_id: string | null;
  subscription_id: string | null;
  created_at: string;
};

type WebhookStatus = {
  verdict: "healthy" | "warning" | "error";
  expected_url: string;
  signing_secret_configured: boolean;
  endpoints: Endpoint[];
  endpoints_error: string | null;
  matching_endpoint: Endpoint | null;
  required_events: string[];
  missing_events: string[];
  counts: { total: number; last_24h: number; last_7d: number };
  recent: RecentEvent[];
  checked_at: string;
};

const VERDICT_STYLE: Record<WebhookStatus["verdict"], { color: string; label: string; Icon: typeof CheckCircle2 }> = {
  healthy: { color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", label: "Healthy", Icon: CheckCircle2 },
  warning: { color: "text-amber-400 border-amber-500/30 bg-amber-500/10", label: "Configured – no recent events", Icon: AlertTriangle },
  error:   { color: "text-red-400 border-red-500/30 bg-red-500/10",       label: "Not delivering",                  Icon: XCircle },
};

export default function StripeWebhookStatusPanel() {
  const [data, setData] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        method: "GET",
        // edge function reads `action` from query string; use raw fetch instead.
      });
      // supabase.functions.invoke can't append query params reliably across versions, so call directly:
      void data; void error;
      const session = (await supabase.auth.getSession()).data.session;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-payments?action=webhook-status`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as WebhookStatus;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-foreground">Stripe Webhook Status</h3>
          {data && (() => {
            const v = VERDICT_STYLE[data.verdict];
            const Icon = v.Icon;
            return (
              <Badge variant="outline" className={`text-[10px] ${v.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {v.label}
              </Badge>
            );
          })()}
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="ml-1 text-xs">Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to load webhook status: {error}
        </div>
      )}

      {data && data.counts.total === 0 && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">No Stripe webhook events have ever been received.</p>
              <p className="opacity-90">
                Until the webhook delivers, paid users will not have their plan synced to <code>profiles</code>.
                Configure an endpoint in Stripe → Developers → Webhooks pointing at:
              </p>
              <code className="block text-[11px] break-all bg-black/30 rounded px-2 py-1">{data.expected_url}</code>
              <p className="opacity-90">
                Subscribe at minimum: <code>checkout.session.completed</code>, <code>customer.subscription.*</code>,
                <code> invoice.payment_succeeded</code>, <code>invoice.payment_failed</code>. Then add the signing
                secret as <code>STRIPE_WEBHOOK_SECRET</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Stat label="Signing secret" value={data.signing_secret_configured ? "Set" : "Missing"} ok={data.signing_secret_configured} />
          <Stat label="Events (24h)" value={data.counts.last_24h.toString()} ok={data.counts.last_24h > 0} />
          <Stat label="Events (7d)" value={data.counts.last_7d.toString()} ok={data.counts.last_7d > 0} />
          <Stat label="Events (total)" value={data.counts.total.toString()} ok={data.counts.total > 0} />
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Configured endpoints</p>
          {data.endpoints_error && (
            <p className="text-xs text-red-400">Could not list endpoints: {data.endpoints_error}</p>
          )}
          {!data.endpoints_error && data.endpoints.length === 0 && (
            <p className="text-xs text-amber-400">No webhook endpoints configured in this Stripe account.</p>
          )}
          {data.endpoints.map((ep) => (
            <div key={ep.id} className="rounded border border-border/60 p-2 text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={ep.matches_expected ? "border-emerald-500/40 text-emerald-400" : "border-border"}>
                  {ep.matches_expected ? "matches expected URL" : "other"}
                </Badge>
                <Badge variant="outline" className={ep.status === "enabled" ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"}>
                  {ep.status}
                </Badge>
                <Badge variant="outline">{ep.livemode ? "live" : "test"}</Badge>
                {ep.api_version && <span className="text-muted-foreground">API {ep.api_version}</span>}
              </div>
              <code className="block break-all text-[11px] text-muted-foreground">{ep.url}</code>
              <div className="text-[11px] text-muted-foreground">
                {ep.enabled_events.length} event{ep.enabled_events.length === 1 ? "" : "s"} subscribed
                {ep.enabled_events.includes("*") && " (all events)"}
              </div>
            </div>
          ))}
          {data.matching_endpoint && data.missing_events.length > 0 && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
              <p className="font-semibold mb-1">Missing event subscriptions on the matching endpoint:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {data.missing_events.map((e) => <li key={e}><code>{e}</code></li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {data && data.recent.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Recent deliveries (last 20)</p>
          <div className="rounded border border-border/60 max-h-56 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card/95">
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1">When</th>
                  <th className="px-2 py-1">Event</th>
                  <th className="px-2 py-1">Mode</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">User / Customer</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((ev) => (
                  <tr key={ev.stripe_event_id} className="border-t border-border/40">
                    <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 font-mono">{ev.event_type}</td>
                    <td className="px-2 py-1">{ev.livemode ? "live" : "test"}</td>
                    <td className="px-2 py-1">{ev.status ?? "—"}</td>
                    <td className="px-2 py-1 font-mono text-muted-foreground truncate max-w-[180px]">
                      {ev.user_id ?? ev.customer_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <p className="text-[10px] text-muted-foreground">
          Checked {new Date(data.checked_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded border p-2 ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={`text-sm font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}>{value}</div>
    </div>
  );
}
