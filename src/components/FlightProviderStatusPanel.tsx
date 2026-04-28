import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Activity, ChevronDown, ChevronUp } from "lucide-react";

interface FaDiag {
  configured: boolean;
  status: number | null;
  ok: boolean;
  error: string | null;
  message: string | null;
  durationMs: number | null;
  endpoint: string;
  checkedAt: number;
}

const ERROR_HINTS: Record<string, string> = {
  missing_api_key: "Add your FLIGHTAWARE_API_KEY in backend secrets.",
  unauthorized: "API key was rejected (401). Verify the key is valid and active.",
  payment_required: "Account has an unpaid balance (402). Check your FlightAware billing.",
  forbidden_plan_tier:
    "Your plan tier does not allow /flights/search/positions (403). Upgrade to Standard or Premium tier.",
  plan_or_query_rejected:
    "FlightAware rejected the request (400). Most often this means the bounding box is too large for your plan tier, or the query parameters are not allowed on the current plan.",
  rate_limited: "Rate limit exceeded (429). Requests are coming too fast — back off and retry.",
  timeout: "FlightAware took longer than 10 s to respond. Network or upstream slowness.",
  network_error: "Could not reach FlightAware servers. Possibly DNS / network issue.",
  empty_response: "FlightAware accepted the query but returned no aircraft in this viewport.",
};

function formatRelative(ts: number) {
  if (!ts) return "never";
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

interface Props {
  /** Optional latest diagnostics from useFlightTracker — used as the primary source. */
  diagnostics?: FaDiag | null;
  /** Active provider currently serving the map (e.g. "flightaware", "adsblol"). */
  activeProvider?: string | null;
}

export default function FlightProviderStatusPanel({ diagnostics, activeProvider }: Props) {
  const [polled, setPolled] = useState<FaDiag | null>(null);
  const [open, setOpen] = useState(true);

  // Fall back to polling /status if the parent never sees a tracker fetch
  useEffect(() => {
    if (diagnostics) return; // parent already provides it
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${supabaseUrl}/functions/v1/flight-tracker?action=status`, {
          headers: {
            Authorization: `Bearer ${session?.access_token || anonKey}`,
            apikey: anonKey,
          },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json?.flightaware) setPolled(json.flightaware);
      } catch {
        /* swallow */
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [diagnostics]);

  const fa: FaDiag | null = diagnostics ?? polled;

  // Determine overall state
  let tone: "ok" | "warn" | "error" | "idle" = "idle";
  let icon = <Activity className="h-4 w-4" />;
  let title = "FlightAware status unknown";

  if (fa) {
    if (fa.ok && activeProvider === "flightaware") {
      tone = "ok";
      icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
      title = "FlightAware is serving live data";
    } else if (fa.ok && activeProvider !== "flightaware") {
      tone = "warn";
      icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
      title = "FlightAware reachable — but another source is active";
    } else if (!fa.configured) {
      tone = "error";
      icon = <XCircle className="h-4 w-4 text-destructive" />;
      title = "FlightAware not configured";
    } else if (fa.error === "plan_or_query_rejected" || fa.error === "forbidden_plan_tier") {
      tone = "warn";
      icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
      title = "FlightAware plan tier too low — using free source";
    } else if (fa.error === "unauthorized") {
      tone = "error";
      icon = <XCircle className="h-4 w-4 text-destructive" />;
      title = "FlightAware key rejected — using free source";
    } else {
      tone = "warn";
      icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
      title = "FlightAware fell back to a free source";
    }
  }

  const hint = fa?.error ? ERROR_HINTS[fa.error] : null;
  const borderTone =
    tone === "ok"
      ? "border-green-500/30"
      : tone === "warn"
      ? "border-amber-500/40"
      : tone === "error"
      ? "border-destructive/40"
      : "border-border";

  return (
    <Card className={`p-3 ${borderTone} bg-card/60 backdrop-blur-sm`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-xs font-display tracking-wider uppercase truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeProvider && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              Source: {activeProvider}
            </Badge>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div>
            <div className="text-muted-foreground uppercase tracking-wider text-[9px]">HTTP</div>
            <div className="font-mono">{fa?.status ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Response time</div>
            <div className="font-mono">{fa?.durationMs != null ? `${fa.durationMs} ms` : "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Last check</div>
            <div className="font-mono">{fa ? formatRelative(fa.checkedAt) : "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Endpoint</div>
            <div className="font-mono truncate">{fa?.endpoint ?? "—"}</div>
          </div>
          {(hint || fa?.message) && (
            <div className="col-span-full">
              <div className="text-muted-foreground uppercase tracking-wider text-[9px] mb-1">Why</div>
              {hint && <p className="text-foreground/90">{hint}</p>}
              {fa?.message && (
                <p className="mt-1 text-muted-foreground font-mono text-[10px] break-all">{fa.message}</p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
