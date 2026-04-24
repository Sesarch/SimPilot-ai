import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProbeResult {
  endpoint: string;
  query?: string;
  status: number;
  ok: boolean;
  body_preview: string;
}

interface DiagResult {
  ok: boolean;
  key?: string;
  verdict: string;
  recommendation: string;
  error?: string;
  probes?: {
    sanity_check: ProbeResult;
    live_positions: ProbeResult;
  };
}

const StatusBadge = ({ status }: { status: number }) => {
  const tone =
    status === 200
      ? "bg-[hsl(var(--hud-green))]/15 text-[hsl(var(--hud-green))] border-[hsl(var(--hud-green))]/30"
      : status >= 400
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] ${tone}`}>
      HTTP {status || "—"}
    </span>
  );
};

export const FlightAwareTestButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [open, setOpen] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke<DiagResult>("flightaware-test", {
        method: "GET",
      });
      if (error) throw error;
      if (!data) throw new Error("Empty response from diagnostic function");
      setResult(data);
      setOpen(true);
      if (data.ok) toast.success("FlightAware live positions OK");
      else toast.error(data.verdict || "FlightAware test failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ ok: false, verdict: "Diagnostic call failed", recommendation: msg, error: msg });
      setOpen(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const VerdictIcon = result?.ok
    ? ShieldCheck
    : result?.probes?.sanity_check.ok
    ? ShieldAlert
    : ShieldX;
  const verdictTone = result?.ok
    ? "text-[hsl(var(--hud-green))]"
    : result?.probes?.sanity_check.ok
    ? "text-accent"
    : "text-destructive";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={runTest}
        disabled={loading}
        className="font-display tracking-wider uppercase text-[10px] sm:text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Testing…
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            Test FlightAware
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider uppercase flex items-center gap-2">
              <VerdictIcon className={`h-5 w-5 ${verdictTone}`} />
              FlightAware Diagnostic
            </DialogTitle>
            <DialogDescription>
              Verifies the configured API key can reach <code className="font-mono">/flights/search/positions</code>.
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4 text-sm">
              {result.key && (
                <div className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">API key</span>
                  <code className="font-mono text-xs">{result.key}</code>
                </div>
              )}

              <div className={`rounded border p-3 ${result.ok ? "border-[hsl(var(--hud-green))]/40 bg-[hsl(var(--hud-green))]/5" : "border-destructive/40 bg-destructive/5"}`}>
                <p className={`font-medium ${verdictTone}`}>{result.verdict}</p>
                <p className="mt-1 text-xs text-muted-foreground">{result.recommendation}</p>
              </div>

              {result.probes && (
                <div className="space-y-2">
                  {(["sanity_check", "live_positions"] as const).map((key) => {
                    const probe = result.probes![key];
                    return (
                      <div key={key} className="rounded border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-mono text-xs text-foreground">{probe.endpoint}</code>
                          <StatusBadge status={probe.status} />
                        </div>
                        {probe.query && (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                            query: {probe.query}
                          </p>
                        )}
                        {probe.body_preview && (
                          <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                            {probe.body_preview}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {result.error && !result.probes && (
                <pre className="rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                  {result.error}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FlightAwareTestButton;
