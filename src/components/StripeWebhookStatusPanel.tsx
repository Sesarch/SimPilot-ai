import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, Webhook, X, XCircle } from "lucide-react";
import { toast } from "sonner";

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
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [creatingEndpoint, setCreatingEndpoint] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testLivemode, setTestLivemode] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    events: RecentEvent[];
    query: string;
    resolved: { customer_ids: string[]; user_ids: string[]; email_matched: boolean };
  } | null>(null);

  const callApi = useCallback(async (qs: string, init?: RequestInit) => {
    const session = (await supabase.auth.getSession()).data.session;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const resp = await fetch(
      `https://${projectId}.supabase.co/functions/v1/admin-payments?${qs}`,
      {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init?.body,
      }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await callApi("action=webhook-status")) as WebhookStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const json = await callApi(`action=search-events&q=${encodeURIComponent(trimmed)}`);
      setSearchResults(json);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  }, [callApi]);

  const backfillEvents = useCallback(async () => {
    setBackfilling(true);
    setBackfillMessage(null);
    setError(null);
    try {
      const result = await callApi("action=backfill-webhook-events", {
        method: "POST",
        body: JSON.stringify({ limit: 100 }),
      });
      setBackfillMessage(`Imported ${result.imported ?? 0} Stripe event(s); synced ${result.affected_users ?? 0} user profile(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }, [callApi, load]);

  const createWebhookEndpoint = useCallback(async () => {
    setCreatingEndpoint(true);
    setError(null);
    try {
      const result = await callApi("action=create-webhook-endpoint", { method: "POST", body: JSON.stringify({}) });
      if (result.signing_secret) {
        toast.success("Webhook endpoint created and signing secret saved.");
      } else {
        toast.info(result.message ?? "Webhook endpoint already exists.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingEndpoint(false);
    }
  }, [callApi, load]);

  const sendTestWebhook = useCallback(async () => {
    setSendingTest(true);
    setError(null);

    // Configurable retry policy: exponential backoff with jitter.
    const maxAttempts = 4;        // total tries before giving up
    const baseDelayMs = 750;      // first backoff
    const maxDelayMs = 8000;      // ceiling per wait
    const isTransientStatus = (s: unknown) => {
      const n = typeof s === "number" ? s : Number(s);
      return Number.isFinite(n) && (n === 0 || n === 408 || n === 425 || n === 429 || (n >= 500 && n <= 599));
    };

    let lastResult: any = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await callApi("action=send-test-webhook", { method: "POST", body: JSON.stringify({}) });
        lastResult = result;
        if (result?.ok) {
          if (attempt > 1) {
            toast.success(`Signed test event verified on attempt ${attempt} (HTTP ${result.delivery_status}).`);
          } else {
            toast.success(`Signed test event verified (HTTP ${result.delivery_status}).`);
          }
          break;
        }
        // Not ok — only retry transient delivery failures.
        if (!isTransientStatus(result?.delivery_status) || attempt === maxAttempts) {
          toast.error(`Test delivery failed: HTTP ${result?.delivery_status ?? "?"} ${result?.delivery_error ?? ""}`.trim());
          break;
        }
      } catch (e) {
        lastError = e;
        if (attempt === maxAttempts) {
          setError(e instanceof Error ? e.message : String(e));
          break;
        }
      }

      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jittered = Math.round(delay * (0.7 + Math.random() * 0.6));
      toast.message(`Test delivery attempt ${attempt} failed — retrying in ${Math.round(jittered / 100) / 10}s…`);
      await new Promise((r) => setTimeout(r, jittered));
    }

    void lastResult; void lastError;
    try { await load(); } finally { setSendingTest(false); }
  }, [callApi, load]);

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
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={sendTestWebhook}
            disabled={sendingTest || !data?.signing_secret_configured}
            title={data?.signing_secret_configured ? "Send a signed test event to stripe-webhook" : "Configure signing secret first"}
          >
            <Webhook className={`w-3.5 h-3.5 ${sendingTest ? "animate-pulse" : ""}`} />
            <span className="ml-1 text-xs">{sendingTest ? "Sending…" : "Send test"}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="ml-1 text-xs">Refresh</span>
          </Button>
        </div>
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
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {data.endpoints.length === 0 && (
                  <Button size="sm" onClick={createWebhookEndpoint} disabled={creatingEndpoint} className="h-7 text-xs">
                    <Webhook className="w-3.5 h-3.5 mr-1.5" />
                    {creatingEndpoint ? "Creating…" : "Create webhook endpoint"}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={backfillEvents} disabled={backfilling} className="h-7 text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${backfilling ? "animate-spin" : ""}`} />
                  {backfilling ? "Importing…" : "Import recent Stripe events"}
                </Button>
                {backfillMessage && <span className="text-[11px] text-emerald-300">{backfillMessage}</span>}
              </div>
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

      {data && (() => {
        const lastVerified = data.recent.find(
          (e) =>
            e.event_type !== "admin.test.ping" &&
            !e.stripe_event_id.startsWith("evt_provision_ping_") &&
            !e.stripe_event_id.startsWith("evt_admin_test_"),
        );
        const lastTest = data.recent.find(
          (e) =>
            e.event_type === "admin.test.ping" ||
            e.stripe_event_id.startsWith("evt_admin_test_") ||
            e.stripe_event_id.startsWith("evt_provision_ping_"),
        );
        const testOk = lastTest?.status ? /^(2|ok|success|received|processed)/i.test(lastTest.status) : true;
        return (
          <div className="space-y-2">
            <div className="rounded border border-border/60 bg-card/30 p-2 text-xs flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Last verified Stripe delivery</span>
              {lastVerified ? (
                <span className="flex items-center gap-2 text-right">
                  <code className="font-mono text-foreground">{lastVerified.event_type}</code>
                  <span className="text-muted-foreground">
                    {new Date(lastVerified.created_at).toLocaleString()}
                  </span>
                  <span className="badge-status-neutral uppercase text-[10px]">
                    {lastVerified.livemode ? "live" : "test"}
                  </span>
                </span>
              ) : (
                <span className="text-amber-400">No verified deliveries yet</span>
              )}
            </div>
            <div className="rounded border border-border/60 bg-card/30 p-2 text-xs flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Last test</span>
              {lastTest ? (
                <span className="flex items-center gap-2 text-right flex-wrap justify-end">
                  <span className={testOk ? "badge-status-success text-[10px]" : "badge-status-danger text-[10px]"}>
                    {lastTest.status ?? "unknown"}
                  </span>
                  <code className="font-mono text-[11px] text-foreground break-all">{lastTest.stripe_event_id}</code>
                  <span className="text-muted-foreground">
                    {new Date(lastTest.created_at).toLocaleString()}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">No test deliveries yet</span>
              )}
            </div>
          </div>
        );
      })()}

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
                <span
                  className={ep.matches_expected ? "badge-status-success" : "badge-status-neutral"}
                  tabIndex={0}
                  role="status"
                >
                  {ep.matches_expected ? "matches expected URL" : "other"}
                </span>
                <span
                  className={ep.status === "enabled" ? "badge-status-success capitalize" : "badge-status-danger capitalize"}
                  tabIndex={0}
                  role="status"
                >
                  {ep.status}
                </span>
                <span className="badge-status-neutral uppercase" tabIndex={0} role="status">{ep.livemode ? "live" : "test"}</span>
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

      {data && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Search events</p>
          <form
            onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Customer email or Stripe customer ID (cus_…)"
                className="h-8 pl-7 pr-7 text-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setSearchResults(null); setSearchError(null); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" variant="secondary" disabled={searching || !query.trim()}>
              {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </Button>
          </form>
          {searchError && (
            <p className="text-xs text-red-400">Search failed: {searchError}</p>
          )}
          {searchResults && (
            <EventTable
              title={
                searchResults.events.length === 0
                  ? `No events for "${searchResults.query}"`
                  : `Search results (${searchResults.events.length}) for "${searchResults.query}"`
              }
              subtitle={
                searchResults.resolved.customer_ids.length || searchResults.resolved.user_ids.length
                  ? `Matched ${searchResults.resolved.customer_ids.length} customer · ${searchResults.resolved.user_ids.length} user`
                  : undefined
              }
              events={searchResults.events}
            />
          )}
        </div>
      )}

      {data && data.recent.length > 0 && !searchResults && (
        <EventTable title="Recent deliveries (last 20)" events={data.recent} />
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

function EventTable({ title, subtitle, events }: { title: string; subtitle?: string; events: RecentEvent[] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      {events.length > 0 && (
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
              {events.map((ev) => (
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
      )}
    </div>
  );
}
