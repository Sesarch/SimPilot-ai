import { useMemo } from "react";
import { CheckCircle2, Pencil, X, Plane, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PmdgDebrief } from "@/components/PmdgDebriefModal";

export type DraftFlightLog = {
  id: string;
  flight_date: string;
  aircraft_type: string | null;
  tail_number: string | null;
  departure: string | null;
  destination: string | null;
  total_time: number;
  remarks: string | null;
  source: string;
  created_at: string;
  pmdg_debrief?: PmdgDebrief | null;
};

interface DraftsReviewPanelProps {
  drafts: DraftFlightLog[];
  onEdit: (draft: DraftFlightLog) => void;
  onFinalize: (id: string) => void | Promise<void>;
  onDiscard: (id: string) => void | Promise<void>;
  onViewDebrief?: (debrief: PmdgDebrief) => void;
}

const sourceLabel = (s: string) =>
  s === "msfs2024" ? "MSFS 2024" : s === "xplane12" ? "X-Plane 12" : s === "atc_session" ? "ATC" : s;

export default function DraftsReviewPanel({
  drafts,
  onEdit,
  onFinalize,
  onDiscard,
}: DraftsReviewPanelProps) {
  const sorted = useMemo(
    () =>
      [...drafts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [drafts],
  );

  if (sorted.length === 0) return null;

  return (
    <div
      className="rounded-lg border p-4 relative overflow-hidden"
      style={{
        borderColor: "hsl(45 95% 58% / 0.45)",
        background:
          "linear-gradient(135deg, hsl(45 95% 58% / 0.10) 0%, hsl(var(--background) / 0.6) 60%, hsl(45 95% 58% / 0.05) 100%)",
        boxShadow:
          "inset 0 1px 0 hsl(45 95% 58% / 0.35), 0 0 14px -6px hsl(45 95% 58% / 0.5)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-[11px] tracking-[0.25em] uppercase font-bold text-amber-400">
            Drafts Awaiting Review · {sorted.length}
          </div>
          <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
            Auto-drafted from sim · confirm to finalize
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((d) => {
          const route =
            d.departure || d.destination
              ? `${d.departure || "—"} → ${d.destination || "—"}`
              : "—";
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-md border border-amber-500/20 bg-background/40 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Plane className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-display text-[11px] tracking-[0.15em] uppercase text-foreground truncate">
                    {d.flight_date} · {route}
                  </div>
                  <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
                    {Number(d.total_time).toFixed(1)} h · {sourceLabel(d.source)}
                    {d.aircraft_type ? ` · ${d.aircraft_type}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(d)}
                  className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-primary"
                  aria-label="Review draft"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Review
                </Button>
                <Button
                  size="sm"
                  onClick={() => onFinalize(d.id)}
                  className="font-display text-[10px] tracking-[0.2em] uppercase bg-[hsl(var(--hud-green))] hover:bg-[hsl(var(--hud-green))]/90 text-background"
                  aria-label="Finalize draft"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Finalize
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDiscard(d.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Discard draft"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
