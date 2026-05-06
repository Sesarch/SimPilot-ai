import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Mic, Volume2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SessionReviewMessage = {
  id: string;
  role: "atc" | "pilot" | "system";
  content: string;
};

export type SessionReviewScore = {
  score: number;
  total: number;
  result: "PASS" | "FAIL";
  summary: string;
  weak_areas: { category: string; issue: string; example?: string }[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: SessionReviewMessage[];
  score: SessionReviewScore | null;
  scenarioLabel: string;
  callsign?: string;
  onDownloadDebrief?: () => void;
}

/** Strip controller-only markup so the review reads like a clean transcript. */
const stripMarkup = (s: string) =>
  s
    .split(/\n?\[FEEDBACK\]/i)[0]
    .replace(/\[CORRECTION[^\]]*\]/gi, "")
    .replace(/\[STATE[^\]]*\]/gi, "")
    .trim();

const extractFeedback = (s: string): string | null => {
  const parts = s.split(/\n?\[FEEDBACK\]/i);
  if (parts.length < 2) return null;
  return parts
    .slice(1)
    .join(" ")
    .replace(/\[CORRECTION[^\]]*\]/gi, "")
    .replace(/\[STATE[^\]]*\]/gi, "")
    .trim() || null;
};

/**
 * Sporty's-style post-flight review:
 *  - Full transcript with role/turn numbers.
 *  - Inline AI coaching feedback shown next to each pilot turn that drew it.
 *  - Top-level phraseology score + weak-area breakdown for quick scanning.
 */
export function SessionReviewModal({
  open,
  onOpenChange,
  messages,
  score,
  scenarioLabel,
  callsign = "N123AB",
  onDownloadDebrief,
}: Props) {
  // Pair each pilot turn with the next ATC reply's [FEEDBACK] (if any) so we
  // can render "what the controller said you got wrong" beneath the pilot line.
  const annotated = useMemo(() => {
    type Row =
      | { kind: "system"; id: string; text: string }
      | { kind: "pilot"; id: string; text: string; feedback: string | null; turn: number }
      | { kind: "atc"; id: string; text: string; turn: number };
    const out: Row[] = [];
    let pilotTurn = 0;
    let atcTurn = 0;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === "system") {
        out.push({ kind: "system", id: m.id, text: m.content });
        continue;
      }
      if (m.role === "atc") {
        atcTurn += 1;
        out.push({ kind: "atc", id: m.id, text: stripMarkup(m.content), turn: atcTurn });
        continue;
      }
      // pilot turn — look ahead for the next ATC's feedback line
      pilotTurn += 1;
      let feedback: string | null = null;
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[j].role === "atc") {
          feedback = extractFeedback(messages[j].content);
          break;
        }
      }
      out.push({ kind: "pilot", id: m.id, text: m.content, feedback, turn: pilotTurn });
    }
    return out;
  }, [messages]);

  const flaggedCount = annotated.filter((r) => r.kind === "pilot" && r.feedback).length;
  const pct = score && score.total > 0 ? Math.round((score.score / score.total) * 100) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-base tracking-[0.15em] uppercase">
                Session Review
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {scenarioLabel} · {callsign}
              </DialogDescription>
            </div>
            {score && (
              <div className="flex items-center gap-2">
                {score.result === "PASS" ? (
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--hud-green))]" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div className="text-right">
                  <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    Phraseology
                  </div>
                  <div
                    className={cn(
                      "font-display text-base tracking-wider",
                      score.result === "PASS"
                        ? "text-[hsl(var(--hud-green))]"
                        : "text-destructive",
                    )}
                  >
                    {score.score}/{score.total}
                    {pct !== null && <span className="ml-1.5 text-foreground/80 text-sm font-normal">({pct}%)</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
          {flaggedCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {flaggedCount} transmission{flaggedCount === 1 ? "" : "s"} flagged for phraseology
              </span>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-3">
            {annotated.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No transmissions in this session yet.</p>
            )}
            {annotated.map((row) => {
              if (row.kind === "system") {
                return (
                  <div key={row.id} className="text-[11px] text-muted-foreground italic text-center">
                    {row.text}
                  </div>
                );
              }
              if (row.kind === "atc") {
                return (
                  <div key={row.id} className="flex justify-start">
                    <div className="max-w-[88%] rounded-md px-3 py-2 bg-muted/40 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Volume2 className="h-3 w-3 text-accent" />
                        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                          ATC · #{row.turn}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{row.text}</div>
                    </div>
                  </div>
                );
              }
              // pilot
              return (
                <div key={row.id} className="flex flex-col items-end gap-1">
                  <div className="flex justify-end w-full">
                    <div
                      className={cn(
                        "max-w-[88%] rounded-md px-3 py-2 border",
                        row.feedback
                          ? "bg-amber-500/5 border-amber-500/40"
                          : "bg-primary/10 border-primary/30",
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mic className="h-3 w-3 text-primary" />
                        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                          PILOT · #{row.turn}
                        </span>
                        {row.feedback && (
                          <Badge variant="outline" className="ml-1 h-4 px-1.5 text-[9px] border-amber-500/60 text-amber-600 dark:text-amber-400">
                            FLAGGED
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{row.text}</div>
                    </div>
                  </div>
                  {row.feedback && (
                    <div className="max-w-[88%] flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 pr-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span><span className="">Coach:</span> {row.feedback}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {score && (score.summary || score.weak_areas.length > 0) && (
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                AI Analysis
              </div>
              {score.summary && (
                <p className="text-sm text-foreground/90 italic">"{score.summary}"</p>
              )}
              {score.weak_areas.length > 0 && (
                <ul className="space-y-1.5">
                  {score.weak_areas.map((w, i) => (
                    <li key={i} className="text-xs text-foreground/90">
                      <span className="text-accent">{w.category}:</span> {w.issue}
                      {w.example && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                          → "{w.example}"
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </ScrollArea>

        {onDownloadDebrief && (
          <div className="border-t border-border px-5 py-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={onDownloadDebrief}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Debrief PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SessionReviewModal;
