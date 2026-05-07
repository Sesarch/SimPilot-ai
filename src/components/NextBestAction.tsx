import { Target, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizAttempt } from "@/hooks/useTopicQuizAttempts";

const LETTERS = ["A", "B", "C", "D"] as const;

interface NextBestActionProps {
  attempts: QuizAttempt[];
  /** Called when user clicks the primary CTA (e.g. start a fresh quiz on this topic). */
  onRetry?: () => void;
}

interface Recommendation {
  kind: "retry-question" | "retry-topic" | "advance";
  title: string;
  reason: string;
  /** ACS code most worth focusing on, if any. */
  acsCode?: string;
  /** A representative missed question to surface. */
  question?: {
    question: string;
    correct: number;
    options: string[];
    explanation?: string;
  };
  /** How many recent attempts repeated this miss. */
  repeatedMisses?: number;
}

function computeRecommendation(attempts: QuizAttempt[]): Recommendation | null {
  if (!attempts.length) return null;
  const last = attempts[0];

  // Perfect last attempt → advance.
  const lastMissed = last.questions.filter((q) => q.user_answer !== q.correct);
  if (last.passed && lastMissed.length === 0) {
    return {
      kind: "advance",
      title: "You're cleared to advance",
      reason:
        "Last attempt was a clean pass with no missed questions. Move on to the next topic in your training plan.",
    };
  }

  // Build a frequency map across the last 5 attempts of which questions were missed.
  const recent = attempts.slice(0, 5);
  const missCount = new Map<string, number>();
  const acsMissCount = new Map<string, number>();
  for (const a of recent) {
    for (const q of a.questions) {
      if (q.user_answer === q.correct) continue;
      const key = q.question.trim().toLowerCase();
      missCount.set(key, (missCount.get(key) ?? 0) + 1);
      if (q.acs_code) {
        acsMissCount.set(q.acs_code, (acsMissCount.get(q.acs_code) ?? 0) + 1);
      }
    }
  }

  // Pick the missed question from the LAST attempt with the highest repeat count.
  let target = lastMissed[0];
  let targetCount = target ? missCount.get(target.question.trim().toLowerCase()) ?? 1 : 0;
  for (const q of lastMissed) {
    const c = missCount.get(q.question.trim().toLowerCase()) ?? 1;
    if (c > targetCount) {
      target = q;
      targetCount = c;
    }
  }

  // Find the most-missed ACS code across recent attempts (helps when the
  // question wording rotates but the underlying knowledge area repeats).
  let topAcs: string | undefined;
  let topAcsCount = 0;
  for (const [code, count] of acsMissCount.entries()) {
    if (count > topAcsCount) {
      topAcs = code;
      topAcsCount = count;
    }
  }

  if (!target) {
    // Failed but no per-question detail — fall back to a topic-level retry.
    return {
      kind: "retry-topic",
      title: "Review the topic and retake",
      reason: `Last score ${last.score}/${last.total}. Re-read the topic outline, then try the quiz again.`,
      acsCode: topAcs,
    };
  }

  const repeated = targetCount >= 2;
  return {
    kind: "retry-question",
    title: repeated
      ? "Focus here — you've missed this concept before"
      : "Start with this missed question",
    reason: repeated
      ? `Missed in ${targetCount} of your last ${recent.length} attempts. Lock this concept in before retaking the full quiz.`
      : `This was your first miss on the last attempt. Reviewing it lifts your score the most.`,
    acsCode: target.acs_code ?? topAcs,
    question: {
      question: target.question,
      correct: target.correct,
      options: target.options,
      explanation: target.explanation,
    },
    repeatedMisses: targetCount,
  };
}

export function NextBestAction({ attempts, onRetry }: NextBestActionProps) {
  const rec = computeRecommendation(attempts);
  if (!rec) return null;

  const isAdvance = rec.kind === "advance";

  return (
    <section
      aria-label="Next best action"
      className={cn(
        "rounded-2xl border overflow-hidden",
        "bg-gradient-to-br from-card via-card to-primary/[0.06]",
        isAdvance ? "border-primary/40" : "border-accent/40",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-5 py-2.5 border-b",
          isAdvance ? "bg-primary/10 border-primary/30" : "bg-accent/10 border-accent/30",
        )}
      >
        <div className="flex items-center gap-2">
          {isAdvance ? (
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          ) : (
            <Target className="w-4 h-4 text-accent" aria-hidden="true" />
          )}
          <p
            className={cn(
              "font-display text-[10px] tracking-[0.25em] uppercase",
              isAdvance ? "text-primary" : "text-accent",
            )}
          >
            Next Best Action
          </p>
        </div>
        {rec.acsCode && (
          <span className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
            ACS {rec.acsCode}
          </span>
        )}
      </header>

      <div className="px-5 py-4 space-y-3">
        <div>
          <h4 className="font-display text-base text-foreground leading-tight">{rec.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.reason}</p>
        </div>

        {rec.question && (
          <div className="rounded-lg border border-border/70 bg-background/40 p-3 space-y-2">
            <p className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              Question to review
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{rec.question.question}</p>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="font-display tracking-wider text-primary mt-0.5">CORRECT:</span>
              <span className="text-foreground">
                {LETTERS[rec.question.correct]}. {rec.question.options[rec.question.correct]}
              </span>
            </div>
            {rec.question.explanation && (
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60">
                {rec.question.explanation}
              </p>
            )}
          </div>
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
              "font-display text-xs tracking-widest uppercase transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isAdvance
                ? "bg-secondary/60 hover:bg-secondary border border-border text-foreground"
                : "bg-primary text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.35)]",
            )}
          >
            {isAdvance ? (
              <>
                Retake for fun
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                Retake this quiz
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}

export default NextBestAction;
