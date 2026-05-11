import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2, Archive } from "lucide-react";
import { toast } from "sonner";

type ExternalSub = {
  subscription_id: string;
  status: string;
  customer_id: string | null;
  customer_email: string | null;
  price_id: string | null;
  product_id: string | null;
  product_name: string | null;
  amount_cents: number | null;
  currency: string | null;
};

type ExternalProduct = {
  product_id: string;
  product_name: string | null;
};

type ListResult = {
  checked_at: string;
  subscriptions: ExternalSub[];
  products: ExternalProduct[];
};

type PurgeResult = {
  success: boolean;
  canceled: Array<{ id: string; status: string }>;
  archived_products: Array<{ id: string; name: string | null }>;
  errors: Array<{ id: string; kind: string; error: string }>;
};

const fnUrl = (action: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payments?action=${action}`;

const ExternalSubscriptionsPanel = () => {
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState<ListResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null);

  const authHeaders = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    return {
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setPurgeResult(null);
    try {
      const res = await fetch(fnUrl("list-external-subs"), { headers: await authHeaders() });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ListResult;
      setResult(data);
      toast.success(
        data.subscriptions.length === 0
          ? "No non-SimPilot subscriptions found."
          : `Found ${data.subscriptions.length} non-SimPilot subscription(s).`,
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to load external subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  const runPurge = useCallback(async () => {
    if (!result) return;
    setPurging(true);
    try {
      const res = await fetch(fnUrl("purge-external-subs"), {
        method: "POST",
        headers: { ...(await authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_ids: result.subscriptions.map((s) => s.subscription_id),
          product_ids: result.products.map((p) => p.product_id),
        }),
      });
      const data = (await res.json()) as PurgeResult;
      if (!res.ok) throw new Error((data as any).error || `HTTP ${res.status}`);
      setPurgeResult(data);
      if (data.errors.length === 0) {
        toast.success(
          `Canceled ${data.canceled.length} sub(s), archived ${data.archived_products.length} product(s).`,
        );
      } else {
        toast.warning(`Completed with ${data.errors.length} error(s) — see details below.`);
      }
      // Reload list to confirm
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Purge failed");
    } finally {
      setPurging(false);
      setConfirmOpen(false);
    }
  }, [result, refresh]);

  const fmtAmount = (cents: number | null, currency: string | null) => {
    if (cents == null) return "—";
    return `${(cents / 100).toFixed(2)} ${(currency || "").toUpperCase()}`;
  };

  return (
    <div className="bg-card/50 border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-amber-500" /> Non-SimPilot Subscriptions
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Lists every live Stripe subscription whose price ID is <strong>not</strong> one of the four SimPilot plans (Student, Pro Pilot, Gold Seal CFI). Cancel them and archive their products in one click.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : result ? "Refresh" : "Scan Stripe"}
        </Button>
      </div>

      {result && (
        <>
          {result.subscriptions.length === 0 ? (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>No non-SimPilot subscriptions found in Stripe.</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="destructive">Subscriptions: {result.subscriptions.length}</Badge>
                <Badge variant="secondary">
                  <Archive className="w-3 h-3 mr-1" />
                  Products: {result.products.length}
                </Badge>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>These subscriptions and products will be canceled / archived in Stripe.</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">Price</th>
                        <th className="text-left p-3">Subscription ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.subscriptions.map((s) => (
                        <tr key={s.subscription_id} className="border-t border-border/50 hover:bg-muted/10">
                          <td className="p-3"><Badge variant="outline" className="text-xs">{s.status}</Badge></td>
                          <td className="p-3 text-xs">{s.customer_email || s.customer_id || "—"}</td>
                          <td className="p-3 text-xs">{s.product_name || s.product_id || "—"}</td>
                          <td className="p-3 text-xs">{fmtAmount(s.amount_cents, s.currency)}</td>
                          <td className="p-3 text-xs font-mono text-muted-foreground">{s.subscription_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                Products to archive:{" "}
                {result.products.map((p) => (
                  <Badge key={p.product_id} variant="secondary" className="font-mono">
                    {p.product_name || p.product_id}
                  </Badge>
                ))}
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={purging}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Cancel {result.subscriptions.length} sub(s) & archive {result.products.length} product(s)
              </Button>
            </>
          )}
        </>
      )}

      {purgeResult && (
        <div className="space-y-2 text-xs border-t border-border/50 pt-3">
          <div className="font-semibold text-sm">Last purge result</div>
          <div>Canceled subscriptions: <span className="font-mono">{purgeResult.canceled.length}</span></div>
          <div>Archived products: <span className="font-mono">{purgeResult.archived_products.length}</span></div>
          {purgeResult.errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-2 space-y-1">
              <div className="text-destructive font-semibold">Errors</div>
              {purgeResult.errors.map((e, i) => (
                <div key={i} className="font-mono">
                  [{e.kind}] {e.id}: {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel and archive non-SimPilot Stripe items?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This will <strong>immediately cancel</strong> {result?.subscriptions.length ?? 0} subscription(s) and{" "}
                  <strong>archive</strong> {result?.products.length ?? 0} product(s) in Stripe.
                </p>
                <p>SimPilot prices are protected — the server re-checks every ID before acting.</p>
                <p className="text-destructive">This cannot be undone from this UI.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runPurge();
              }}
              disabled={purging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {purging ? "Purging…" : "Yes, cancel & archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExternalSubscriptionsPanel;
