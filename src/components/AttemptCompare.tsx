import { useMemo, useState } from "react";
import {
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Equal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAttempt, QuizAttemptQuestion } from "@/hooks/useTopicQuizAttempts";

const LETTERS = ["A", "B", "C", "D"] as const;

type ChangeKind =
  | "fixed" // was wrong, now correct
  | "regressed" // was correct, now wrong
  | "still-missed" // wrong both times
  | "still-correct" // correct both times
  | "new" // only on current attempt
  | "dropped"; // only on previous attempt

interface ChangedQuestion {
  kind: ChangeKind;
  question: string;
  options: string[];
  correct: number;
  acs_code?: string;
  explanation?: string;
  prevAnswer?: number;
  curAnswer?: number;
}

function key(q: QuizAttemptQuestion): string {
  return q.question.trim().toLowerCase();
}

function diffAttempts(current: QuizAttempt, previous: QuizAttempt): ChangedQuestion[] {
  const prevByKey = new Map(previous.questions.map((q) => [key(q), q] as const));
  const curByKey = new Map(current.questions.map((q) => [key(q), q] as const));
  const out: ChangedQuestion[] = [];

  for (const cur of current.questions) {
    const prev = prevByKey.get(key(cur));
    if (!prev) {
      out.push({
        kind: "new",
        question: cur.question,
        options: cur.options,
        correct: cur.correct,
        acs_code: cur.acs_code,
        explanation: cur.explanation,
        curAnswer: cur.user_answer,
      });
      continue;
    }
    const prevOk = prev.user_answer === prev.correct;
    const curOk = cur.user_answer === cur.correct;
    let kind: ChangeKind;
    if (!prevOk && curOk) kind = "fixed";
    else if (prevOk && !curOk) kind = "regressed";
    else if (!prevOk && !curOk) kind = "still-missed";
    else kind = "still-correct";
    out.push({
      kind,
      question: cur.question,
      options: cur.options,
      correct: cur.correct,
      acs_code: cur.acs_code,
      explanation: cur.explanation,
      prevAnswer: prev.user_answer,
      curAnswer: cur.user_answer,
    });
  }

  for (const prev of previous.questions) {
    if (curByKey.has(key(prev))) continue;
    out.push({
      kind: "dropped",
      question: prev.question,
      options: prev.options,
      correct: prev.correct,
      acs_code: prev.acs_code,
      explanation: prev.explanation,
      prevAnswer: prev.user_answer,
    });
  }

  // Sort: changes first (fixed, regressed), then still-missed, then dropped/new, then still-correct.
  const order: Record<ChangeKind, number> = {
    fixed: 0,
    regressed: 1,
    "still-missed": 2,
    new: 3,
    dropped: 4,
    "still-correct": 5,
  };
  out.sort((a, b) => order[a.kind] - order[b.kind]);
  return out;
}

const KIND_META: Record<
  ChangeKind,
  { label: string; tone: "good" | "bad" | "neutral"; Icon: typeof CheckCircle2 }
> = {
  fixed: { label: "Fixed", tone: "good", Icon: ArrowUpRight },
  regressed: { label: "Regressed", tone: "bad", Icon: ArrowDownRight },
  "still-missed": { label: "Still missed", tone: "bad", Icon: XCircle },
  "still-correct": { label: "Still correct", tone: "neutral", Icon: CheckCircle2 },
  new: { label: "New question", tone: "neutral", Icon: Minus },
  dropped: { label: "Not in current", tone: "neutral", Icon: Minus },
};

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

interface AttemptCompareProps {
  attempts: QuizAttempt[];
}

export function AttemptCompare({ attempts }: AttemptCompareProps) {
  const [showAll, setShowAll] = useState(false);

  if (attempts.length < 2) return null;

  const current = attempts[0];
  const previous = attempts[1];

  const changes = useMemo(() => diffAttempts(current, previous), [current, previous]);
  const counts = useMemo(() => {
    const c: Record<ChangeKind, number> = {
      fixed: 0,
      regressed: 0,
      "still-missed": 0,
      "still-correct": 0,
      new: 0,
      dropped: 0,
    };
    for (const ch of changes) c[ch.kind]++;
    return c;
  }, [changes]);

  const delta = current.score - previous.score;
  const deltaPct =
    Math.round((current.score / current.total) * 100) -
    Math.round((previous.score / previous.total) * 100);
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Equal;
  const trendTone =
    delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground";

  const visible = showAll
    ? changes
    : changes.filter((c) => c.kind === "fixed" || c.kind === "regressed" || c.kind === "still-missed");

  return (
    <section
      aria-label="Attempt comparison"
      className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" aria-hidden="true" />
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-primary">
            Attempt Compare
          </p>
        </div>
        <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
          Previous vs Current
        </p>
      </header>

      {/* Score summary */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border">
        <div>
          <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground">
            Previous
          </p>
          <p className="font-display text-2xl text-foreground leading-none mt-1">
            {previous.score}
            <span className="text-muted-foreground text-base">/{previous.total}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(previous.created_at)}</p>
        </div>
        <div>
          <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground">
            Current
          </p>
          <p className="font-display text-2xl text-foreground leading-none mt-1">
            {current.score}
            <span className="text-muted-foreground text-base">/{current.total}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(current.created_at)}</p>
        </div>
        <div>
          <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground">
            Delta
          </p>
          <p className={cn("font-display text-2xl leading-none mt-1 flex items-center gap-1.5", trendTone)}>
            <TrendIcon className="w-5 h-5" aria-hidden="true" />
            {delta > 0 ? "+" : ""}
            {delta}
          </p>
          <p className={cn("text-[10px] mt-1", trendTone)}>
            {deltaPct > 0 ? "+" : ""}
            {deltaPct}%
          </p>
        </div>
      </div>

      {/* Change tally */}
      <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-border">
        {([
          ["fixed", counts.fixed],
          ["regressed", counts.regressed],
          ["still-missed", counts["still-missed"]],
          ["still-correct", counts["still-correct"]],
          ["new", counts.new],
          ["dropped", counts.dropped],
        ] as Array<[ChangeKind, number]>).map(([k, n]) => {
          if (n === 0) return null;
          const meta = KIND_META[k];
          return (
            <span
              key={k}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-display tracking-widest uppercase",
                meta.tone === "good" && "border-primary/40 bg-primary/10 text-primary",
                meta.tone === "bad" && "border-destructive/40 bg-destructive/10 text-destructive",
                meta.tone === "neutral" && "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              <meta.Icon className="w-3 h-3" aria-hidden="true" />
              {meta.label}: {n}
            </span>
          );
        })}
      </div>

      {/* Changed questions */}
      <div className="px-5 py-4">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No status changes — every question landed the same way.
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((c, i) => {
              const meta = KIND_META[c.kind];
              const toneBorder =
                meta.tone === "good"
                  ? "border-primary/40 bg-primary/[0.06]"
                  : meta.tone === "bad"
                    ? "border-destructive/40 bg-destructive/[0.06]"
                    : "border-border bg-secondary/30";
              const toneText =
                meta.tone === "good"
                  ? "text-primary"
                  : meta.tone === "bad"
                    ? "text-destructive"
                    : "text-muted-foreground";
              return (
                <li key={i} className={cn("rounded-lg border p-3", toneBorder)}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs text-foreground/90 flex-1">{c.question}</p>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 font-display text-[10px] tracking-widest uppercase",
                        toneText,
                      )}
                    >
                      <meta.Icon className="w-3 h-3" aria-hidden="true" />
                      {meta.label}
                    </span>
                  </div>
                  {c.acs_code && (
                    <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground mb-1.5">
                      ACS {c.acs_code}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md border border-border/70 bg-background/40 p-2">
                      <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground mb-0.5">
                        Previous answer
                      </p>
                      {c.prevAnswer === undefined ? (
                        <p className="text-muted-foreground italic">Not asked</p>
                      ) : (
                        <p
                          className={cn(
                            "flex items-start gap-1.5",
                            c.prevAnswer === c.correct ? "text-primary" : "text-destructive",
                          )}
                        >
                          {c.prevAnswer === c.correct ? (
                            <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-foreground/90">
                            {LETTERS[c.prevAnswer] ?? "—"}. {c.options[c.prevAnswer] ?? "(no answer)"}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="rounded-md border border-border/70 bg-background/40 p-2">
                      <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground mb-0.5">
                        Current answer
                      </p>
                      {c.curAnswer === undefined ? (
                        <p className="text-muted-foreground italic">Not asked</p>
                      ) : (
                        <p
                          className={cn(
                            "flex items-start gap-1.5",
                            c.curAnswer === c.correct ? "text-primary" : "text-destructive",
                          )}
                        >
                          {c.curAnswer === c.correct ? (
                            <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-foreground/90">
                            {LETTERS[c.curAnswer] ?? "—"}. {c.options[c.curAnswer] ?? "(no answer)"}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-primary mt-2 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="font-display tracking-wider">CORRECT:</span>{" "}
                      <span className="text-foreground">
                        {LETTERS[c.correct]}. {c.options[c.correct]}
                      </span>
                    </span>
                  </p>
                  {c.explanation && (c.kind === "regressed" || c.kind === "still-missed") && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed border-t border-border/60 pt-1.5">
                      {c.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {(counts["still-correct"] > 0 || counts.new > 0 || counts.dropped > 0) && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 font-display text-[10px] tracking-widest uppercase text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
          >
            {showAll ? "Hide unchanged" : `Show all ${changes.length} questions`}
          </button>
        )}
      </div>
    </section>
  );
}

export default AttemptCompare;
