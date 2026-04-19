import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Plane, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PmdgDebrief {
  generated_at?: string;
  variant?: string | null;
  aircraft_title?: string | null;
  duration_minutes?: number | null;
  departure?: string | null;
  destination?: string | null;
  summary?: string;
  scores?: {
    automation?: number;
    flap_schedule?: number;
    stable_approach?: number;
  };
  automation?: {
    ap_engagement_call?: string;
    at_usage_call?: string;
    engage_disengage_count?: number;
    issues?: string[];
  };
  flap_schedule?: {
    findings?: Array<{
      flap_setting: number;
      ias_kt: number;
      placard_kt?: number;
      exceedance_kt?: number;
      time_mmss?: string;
      verdict: "ok" | "marginal" | "exceedance";
      note?: string;
    }>;
  };
  stable_approach?: {
    verdict?: "stable" | "marginal" | "unstable" | "unknown";
    note?: string;
  };
  recommendations?: string[];
  event_timeline?: unknown[];
}

interface PmdgDebriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: string | null;
  debrief?: PmdgDebrief | null;
}

const scoreColor = (n?: number) => {
  if (n == null) return "text-muted-foreground";
  if (n >= 85) return "text-[hsl(var(--cyan-glow))]";
  if (n >= 70) return "text-[hsl(var(--amber-instrument))]";
  return "text-destructive";
};

const verdictBadge = (v?: string) => {
  switch (v) {
    case "ok":
    case "stable":
      return { className: "border-primary/40 bg-primary/10 text-primary", icon: CheckCircle2 };
    case "marginal":
      return {
        className: "border-amber-500/40 bg-amber-500/10 text-amber-500",
        icon: AlertTriangle,
      };
    case "exceedance":
    case "unstable":
      return {
        className: "border-destructive/50 bg-destructive/10 text-destructive",
        icon: AlertTriangle,
      };
    default:
      return { className: "border-border text-muted-foreground", icon: AlertTriangle };
  }
};

const PmdgDebriefModal = ({
  open,
  onOpenChange,
  loading,
  error,
  debrief,
}: PmdgDebriefModalProps) => {
  // Force a brief mounting delay so the loading state isn't a flash
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => setShow(true), 50);
      return () => window.clearTimeout(id);
    }
    setShow(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-orbitron">
            <Sparkles className="h-5 w-5 text-primary" />
            Airline-Style PMDG Debrief
            {debrief?.variant && (
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {debrief.variant}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {debrief?.departure || debrief?.destination ? (
              <span className="inline-flex items-center gap-1.5 text-foreground/80">
                <Plane className="h-3.5 w-3.5" />
                {debrief.departure ?? "????"} → {debrief.destination ?? "????"}
                {debrief.duration_minutes != null && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {debrief.duration_minutes.toFixed(1)} min
                  </span>
                )}
              </span>
            ) : (
              "Generated from your captured PMDG event timeline."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && show && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Reviewing your flight timeline…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {debrief && !loading && (
          <div className="space-y-5 pt-1">
            {/* Score row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Automation", value: debrief.scores?.automation },
                { label: "Flap Schedule", value: debrief.scores?.flap_schedule },
                { label: "Stable Approach", value: debrief.scores?.stable_approach },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-md border border-border bg-background/40 p-3 text-center"
                >
                  <div className="font-display text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/70">
                    {s.label}
                  </div>
                  <div
                    className={cn(
                      "font-display text-2xl font-extrabold tabular-nums mt-1",
                      scoreColor(s.value),
                    )}
                  >
                    {s.value != null ? `${s.value}` : "—"}
                  </div>
                </div>
              ))}
            </div>

            {debrief.summary && (
              <p className="text-sm leading-relaxed text-foreground/90">{debrief.summary}</p>
            )}

            {/* Automation */}
            {debrief.automation && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Automation Discipline
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {debrief.automation.ap_engagement_call && (
                    <div className="rounded-md border border-border bg-background/40 p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        A/P engagement
                      </div>
                      <div className="text-foreground/90">{debrief.automation.ap_engagement_call}</div>
                    </div>
                  )}
                  {debrief.automation.at_usage_call && (
                    <div className="rounded-md border border-border bg-background/40 p-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        A/T usage
                      </div>
                      <div className="text-foreground/90">{debrief.automation.at_usage_call}</div>
                    </div>
                  )}
                </div>
                {debrief.automation.issues && debrief.automation.issues.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
                    {debrief.automation.issues.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Flap schedule */}
            {debrief.flap_schedule?.findings && debrief.flap_schedule.findings.length > 0 && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Flap Speed Schedule
                </h4>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Time</th>
                        <th className="px-3 py-2 text-left font-medium">Flap</th>
                        <th className="px-3 py-2 text-left font-medium">IAS</th>
                        <th className="px-3 py-2 text-left font-medium">Placard</th>
                        <th className="px-3 py-2 text-left font-medium">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debrief.flap_schedule.findings.map((f, idx) => {
                        const v = verdictBadge(f.verdict);
                        const Icon = v.icon;
                        return (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                              {f.time_mmss ?? "—"}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{f.flap_setting}</td>
                            <td className="px-3 py-2 tabular-nums">{f.ias_kt} kt</td>
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">
                              {f.placard_kt ? `${f.placard_kt} kt` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                  v.className,
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {f.verdict}
                                {f.exceedance_kt ? ` +${f.exceedance_kt}` : ""}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Stable approach */}
            {debrief.stable_approach?.verdict && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Stable Approach
                </h4>
                {(() => {
                  const v = verdictBadge(debrief.stable_approach!.verdict);
                  const Icon = v.icon;
                  return (
                    <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0",
                          v.className,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {debrief.stable_approach!.verdict}
                      </span>
                      {debrief.stable_approach!.note && (
                        <p className="text-sm text-foreground/90">
                          {debrief.stable_approach!.note}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Recommendations */}
            {debrief.recommendations && debrief.recommendations.length > 0 && (
              <section className="space-y-2">
                <h4 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-primary">
                  Next Leg · Action Items
                </h4>
                <ul className="list-decimal pl-5 text-sm text-foreground/90 space-y-1.5">
                  {debrief.recommendations.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </section>
            )}

            {debrief.generated_at && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Generated {new Date(debrief.generated_at).toLocaleString()} ·{" "}
                {debrief.event_timeline?.length ?? 0} events analyzed
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PmdgDebriefModal;
