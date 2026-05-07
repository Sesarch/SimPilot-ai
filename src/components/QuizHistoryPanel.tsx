import { useState } from "react";
import { CheckCircle2, XCircle, History, ChevronDown, ChevronUp, Trophy, AlertTriangle, Settings2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAttempt } from "@/hooks/useTopicQuizAttempts";
import { useAuth } from "@/hooks/useAuth";
import { useQuizHistoryLimit } from "@/hooks/useQuizHistoryLimit";

const LETTERS = ["A", "B", "C", "D"] as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface QuizHistoryPanelProps {
  attempts: QuizAttempt[];
  loading?: boolean;
}

export function QuizHistoryPanel({ attempts, loading }: QuizHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(attempts[0]?.id ?? null);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useAuth();
  const { limit, save, saving, MIN_LIMIT, MAX_LIMIT } = useQuizHistoryLimit(user?.id);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            Attempt History
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Loading your past attempts…</p>
      </div>
    );
  }

  if (!attempts.length) return null;

  const last = attempts[0];
  const passedCount = attempts.filter((a) => a.passed).length;

  return (
    <section
      aria-label="Quiz attempt history"
      className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden"
    >
      {/* Header summary */}
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" aria-hidden="true" />
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-primary">
            Attempt History
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
            {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"} · {passedCount} passed
          </p>
          {user && (
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              aria-label="History settings"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-border bg-background/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {showSettings && user && (
        <div className="px-5 py-3 border-b border-border bg-background/30 space-y-2">
          <div className="flex items-center gap-2">
            <Archive className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Auto-archive older attempts
            </p>
          </div>
          <label className="flex items-center gap-3 text-xs text-foreground/85">
            <span className="shrink-0">Keep last</span>
            <input
              type="range"
              min={MIN_LIMIT}
              max={MAX_LIMIT}
              step={1}
              value={limit}
              disabled={saving}
              onChange={(e) => save(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Number of attempts to keep visible"
            />
            <span className="font-display text-sm text-primary tabular-nums w-8 text-right">{limit}</span>
            <span className="shrink-0 text-muted-foreground">attempts</span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            Older attempts are archived (not deleted) the next time you finish a quiz on this topic.
          </p>
        </div>
      )}

      {/* Last attempt highlight */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center",
              last.passed
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-destructive/10 border-destructive/40 text-destructive",
            )}
            aria-hidden="true"
          >
            {last.passed ? <Trophy className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
              Last Attempt
            </p>
            <p className="text-sm text-foreground">
              <span className="font-display">
                {last.score}/{last.total}
              </span>{" "}
              · <span className={last.passed ? "text-primary" : "text-destructive"}>
                {last.passed ? "PASSED" : "FAILED"}
              </span>{" "}
              <span className="text-muted-foreground">· {formatDate(last.created_at)}</span>
              {last.certificate_level && (
                <span className="text-muted-foreground"> · {last.certificate_level} track</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Attempt list */}
      <ol className="divide-y divide-border" aria-label="All attempts">
        {attempts.map((a, idx) => {
          const expanded = expandedId === a.id;
          const missed = a.questions.filter((q) => q.user_answer !== q.correct);
          return (
            <li key={a.id} className="px-5 py-3">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : a.id)}
                aria-expanded={expanded}
                aria-controls={`attempt-${a.id}`}
                className="w-full flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-md"
              >
                {a.passed ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-display text-sm text-foreground">
                    Attempt {attempts.length - idx}
                  </span>
                  <span className="font-display text-xs text-foreground">
                    {a.score}/{a.total}
                  </span>
                  <span
                    className={cn(
                      "font-display text-[10px] tracking-widest uppercase",
                      a.passed ? "text-primary" : "text-destructive",
                    )}
                  >
                    {a.passed ? "Pass" : "Fail"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(a.created_at)}
                  </span>
                  {missed.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      · missed {missed.length} of {a.total}
                    </span>
                  )}
                </div>
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                )}
              </button>

              {expanded && (
                <div id={`attempt-${a.id}`} className="mt-3 space-y-2">
                  {missed.length === 0 ? (
                    <p className="text-xs text-primary inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Perfect score — every question correct.
                    </p>
                  ) : (
                    <>
                      <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
                        Questions Missed
                      </p>
                      <ul className="space-y-2">
                        {missed.map((q, i) => (
                          <li
                            key={i}
                            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-xs text-foreground/90 flex-1">{q.question}</p>
                              {q.acs_code && (
                                <span className="font-display text-[10px] tracking-widest text-muted-foreground shrink-0">
                                  {q.acs_code}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <p className="flex items-center gap-1.5 text-destructive">
                                <XCircle className="w-3 h-3" aria-hidden="true" />
                                <span className="font-display tracking-wider">YOU:</span>
                                <span className="text-foreground/80">
                                  {LETTERS[q.user_answer] ?? "—"}.{" "}
                                  {q.options[q.user_answer] ?? "(no answer)"}
                                </span>
                              </p>
                              <p className="flex items-center gap-1.5 text-primary">
                                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                <span className="font-display tracking-wider">CORRECT:</span>
                                <span className="text-foreground">
                                  {LETTERS[q.correct]}. {q.options[q.correct]}
                                </span>
                              </p>
                              {q.explanation && (
                                <p className="text-muted-foreground pt-1 leading-relaxed">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default QuizHistoryPanel;
