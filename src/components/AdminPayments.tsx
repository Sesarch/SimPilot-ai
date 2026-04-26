import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, TrendingUp, TrendingDown, Users, RefreshCw, ExternalLink, Gift, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Metrics = {
  mrr_cents: number;
  active_subscriptions: number;
  trialing: number;
  past_due: number;
  canceled_last_30d: number;
  new_last_30d: number;
  churn_rate_pct: number;
  comp_grants_active: number;
  trend: { date: string; signups: number; cancels: number }[];
};

type Subscription = {
  id: string;
  status: string;
  customer_email: string | null;
  product_name?: string;
  amount_cents?: number;
  currency?: string;
  interval?: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  created: number;
};

type Invoice = {
  id: string;
  number: string | null;
  status: string;
  amount_paid: number;
  currency: string;
  customer_email: string | null;
  created: number;
  hosted_invoice_url: string | null;
  payment_intent: string | null;
};

type CompGrant = {
  id: string;
  user_id: string;
  plan_tier: string;
  reason: string | null;
  expires_at: string | null;
  granted_by_email: string | null;
  created_at: string;
};

const fmt = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format((cents || 0) / 100);

const callFn = async (fn: string, qs = "", body?: any) => {
  const session = (await supabase.auth.getSession()).data.session;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}${qs}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
};

const AdminPayments = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [grants, setGrants] = useState<CompGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "cancel" | "refund" | "revoke"; id: string; label: string; amount?: number; pi?: string } | null>(null);
  const [refundAmt, setRefundAmt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s, i, g] = await Promise.all([
        callFn("admin-payments", "?action=metrics"),
        callFn("admin-payments", "?action=list-subscriptions"),
        callFn("admin-payments", "?action=list-invoices"),
        callFn("admin-payments", "?action=list-comp-grants"),
      ]);
      setMetrics(m);
      setSubs(s.subscriptions || []);
      setInvoices(i.invoices || []);
      setGrants(g.grants || []);
    } catch (e: any) {
      toast.error("Load failed: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === "cancel") {
        await callFn("admin-payments", "?action=cancel-subscription", { subscription_id: confirm.id, at_period_end: true });
        toast.success("Subscription will cancel at period end");
      } else if (confirm.kind === "refund") {
        const amt = refundAmt ? Math.round(parseFloat(refundAmt) * 100) : undefined;
        await callFn("admin-payments", "?action=refund", { payment_intent: confirm.pi, amount: amt, reason: "requested_by_customer" });
        toast.success("Refund issued");
      } else if (confirm.kind === "revoke") {
        await callFn("admin-payments", "?action=revoke-comp", { grant_id: confirm.id });
        toast.success("Comp grant revoked");
      }
      setConfirm(null);
      setRefundAmt("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const churnPositive = metrics && metrics.new_last_30d >= metrics.canceled_last_30d;

  // Simple inline trend bars (signups green / cancels red)
  const maxTrend = metrics ? Math.max(1, ...metrics.trend.flatMap(t => [t.signups, t.cancels])) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Payments & Revenue
        </h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* MRR & key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={metrics ? fmt(metrics.mrr_cents) : "—"} icon={<DollarSign className="w-4 h-4" />} accent="primary" />
        <MetricCard label="Active subs" value={metrics?.active_subscriptions ?? "—"} icon={<Users className="w-4 h-4" />} />
        <MetricCard label="Churn (30d)" value={metrics ? `${metrics.churn_rate_pct}%` : "—"} icon={churnPositive ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-destructive" />} />
        <MetricCard label="Comp grants" value={metrics?.comp_grants_active ?? "—"} icon={<Gift className="w-4 h-4" />} />
      </div>

      {/* 30-day trend */}
      {metrics && (
        <div className="bg-card/50 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold">30-Day Subscription Flow</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500" />New: {metrics.new_last_30d}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-destructive" />Lost: {metrics.canceled_last_30d}</span>
            </div>
          </div>
          <div className="flex items-end gap-[2px] h-24">
            {metrics.trend.map((t) => (
              <div key={t.date} title={`${t.date}  •  +${t.signups} / -${t.cancels}`} className="flex-1 flex flex-col justify-end gap-[1px] min-w-0">
                <div className="bg-green-500/70 rounded-sm" style={{ height: `${(t.signups / maxTrend) * 100}%` }} />
                <div className="bg-destructive/70 rounded-sm" style={{ height: `${(t.cancels / maxTrend) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics?.past_due ? (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span><strong>{metrics.past_due}</strong> subscription(s) past due — payment retry needed.</span>
        </div>
      ) : null}

      <Tabs defaultValue="subs">
        <TabsList>
          <TabsTrigger value="subs">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="comps">Comp Grants</TabsTrigger>
        </TabsList>

        <TabsContent value="subs">
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left p-3">Customer</th><th className="text-left p-3">Plan</th><th className="text-left p-3">Status</th><th className="text-left p-3">Renews</th><th className="text-right p-3">Actions</th></tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t border-border/50 hover:bg-muted/10">
                    <td className="p-3">{s.customer_email || "—"}</td>
                    <td className="p-3">
                      {s.product_name || "—"}
                      <span className="text-xs text-muted-foreground ml-2">
                        {s.amount_cents ? fmt(s.amount_cents, s.currency) : ""}/{s.interval || ""}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant={s.status === "active" ? "default" : s.status === "trialing" ? "secondary" : "destructive"} className="text-xs capitalize">
                        {s.status}{s.cancel_at_period_end ? " (ending)" : ""}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {s.current_period_end ? new Date(s.current_period_end * 1000).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {s.status === "active" && !s.cancel_at_period_end && (
                        <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={() => setConfirm({ kind: "cancel", id: s.id, label: `subscription for ${s.customer_email}` })}>
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!subs.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No subscriptions yet</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left p-3">Invoice</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Status</th><th className="text-left p-3">Date</th><th className="text-right p-3">Actions</th></tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border/50 hover:bg-muted/10">
                    <td className="p-3 text-xs font-mono">{inv.number || inv.id.slice(0, 14)}</td>
                    <td className="p-3">{inv.customer_email || "—"}</td>
                    <td className="p-3">{fmt(inv.amount_paid, inv.currency)}</td>
                    <td className="p-3"><Badge variant="secondary" className="text-xs capitalize">{inv.status}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(inv.created * 1000).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {inv.hosted_invoice_url && (
                          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
                          </Button>
                        )}
                        {inv.payment_intent && inv.status === "paid" && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 text-amber-500"
                            onClick={() => { setRefundAmt(""); setConfirm({ kind: "refund", id: inv.id, pi: inv.payment_intent!, label: `invoice ${inv.number || inv.id}`, amount: inv.amount_paid }); }}>
                            Refund
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!invoices.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No invoices yet</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="comps">
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left p-3">User ID</th><th className="text-left p-3">Plan</th><th className="text-left p-3">Reason</th><th className="text-left p-3">Granted by</th><th className="text-left p-3">Expires</th><th className="text-right p-3"></th></tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-t border-border/50 hover:bg-muted/10">
                    <td className="p-3 text-xs font-mono">{g.user_id.slice(0, 8)}…</td>
                    <td className="p-3"><Badge className="text-xs capitalize">{g.plan_tier}</Badge></td>
                    <td className="p-3 text-xs">{g.reason || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{g.granted_by_email || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "Never"}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive"
                        onClick={() => setConfirm({ kind: "revoke", id: g.id, label: `comp grant for ${g.user_id.slice(0, 8)}…` })}>
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
                {!grants.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No active comp grants. Grant one from the Users tab.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "cancel" && "Cancel subscription?"}
              {confirm?.kind === "refund" && "Issue refund?"}
              {confirm?.kind === "revoke" && "Revoke comp grant?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "cancel" && `The ${confirm.label} will end at the current billing period.`}
              {confirm?.kind === "refund" && (
                <div className="space-y-3">
                  <p>Refund {confirm.label}. Leave amount blank for full refund (max {fmt(confirm.amount || 0)}).</p>
                  <Input type="number" step="0.01" placeholder="Amount in dollars (optional)" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} />
                </div>
              )}
              {confirm?.kind === "revoke" && `Revoke the ${confirm.label}? They will lose comp access immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MetricCard = ({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon: React.ReactNode; accent?: "primary" }) => (
  <div className={`bg-card/50 border border-border rounded-xl p-5 ${accent === "primary" ? "ring-1 ring-primary/30" : ""}`}>
    <div className="flex items-center justify-between mb-1 text-muted-foreground">
      <span className="text-xs uppercase tracking-wider">{label}</span>{icon}
    </div>
    <p className="text-2xl font-display font-bold text-foreground">{value}</p>
  </div>
);

export default AdminPayments;
