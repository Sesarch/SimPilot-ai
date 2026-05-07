import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ClipboardCheck, Sparkles, RotateCcw, ChevronRight, Trophy, AlertTriangle } from "lucide-react";
import type { GroundQuiz } from "@/lib/groundQuiz";
import { cn } from "@/lib/utils";

interface GroundQuizCardProps {
  quiz: GroundQuiz;
  /** Called once when the user finishes the quiz. */
  onComplete?: (result: { score: number; total: number; passed: boolean; answers: number[] }) => void;
  /** Optional retry handler — if provided, shown on the result screen. */
  onRetry?: () => void;
}

const LETTERS = ["A", "B", "C", "D"] as const;
const PASS_RATIO = 2 / 3;

export function GroundQuizCard({ quiz, onComplete, onRetry }: GroundQuizCardProps) {
  const total = quiz.questions.length;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);

  const current = quiz.questions[index];
  const score = useMemo(
    () => answers.reduce((acc, ans, i) => acc + (ans === quiz.questions[i].correct ? 1 : 0), 0),
    [answers, quiz.questions],
  );
  const passed = score / total >= PASS_RATIO;

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setRevealed(true);
    setAnswers((prev) => [...prev, selected]);
  };

  const handleNext = () => {
    if (index + 1 >= total) {
      setCompleted(true);
      const finalAnswers = answers;
      const finalScore = finalAnswers.reduce(
        (acc, ans, i) => acc + (ans === quiz.questions[i].correct ? 1 : 0),
        0,
      );
      const finalPassed = finalScore / total >= PASS_RATIO;
      onComplete?.({ score: finalScore, total, passed: finalPassed, answers: finalAnswers });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const handleRestart = () => {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setCompleted(false);
    onRetry?.();
  };

  if (completed) {
    return (
      <div
        role="region"
        aria-label="Quiz results"
        className={cn(
          "rounded-2xl border bg-gradient-to-br from-card via-card to-secondary/30 p-6 shadow-[0_0_40px_hsl(var(--cyan-glow)/0.08)]",
          passed ? "border-primary/40" : "border-destructive/40",
        )}
      >
        <div className="flex items-start gap-4 mb-5">
          <div
            className={cn(
              "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border",
              passed
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-destructive/10 border-destructive/40 text-destructive",
            )}
          >
            {passed ? <Trophy className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Knowledge Check
            </p>
            <h3 className="font-display text-lg text-foreground">
              {passed ? "Topic Passed" : "Review Recommended"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{quiz.topic}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-3xl text-foreground leading-none">
              {score}
              <span className="text-muted-foreground text-xl">/{total}</span>
            </div>
            <p className="text-[10px] font-display tracking-widest uppercase text-muted-foreground mt-1">
              {Math.round((score / total) * 100)}%
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {quiz.questions.map((q, i) => {
            const ans = answers[i];
            const ok = ans === q.correct;
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
              >
                {ok ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/90 line-clamp-2">{q.question}</p>
                  {!ok && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Correct: <span className="text-foreground">{LETTERS[q.correct]}. {q.options[q.correct]}</span>
                    </p>
                  )}
                </div>
                {q.acs_code && (
                  <span className="font-display text-[10px] tracking-widest text-muted-foreground shrink-0">
                    {q.acs_code}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {passed
              ? "Topic marked complete in your Flight Deck."
              : "Pass 2 of 3 to mark this topic complete. Review and try again."}
          </p>
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-xs font-display tracking-widest uppercase text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  const progressPct = ((index + (revealed ? 1 : 0)) / total) * 100;

  return (
    <div
      role="region"
      aria-label="Knowledge check quiz"
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-[0_0_40px_hsl(var(--cyan-glow)/0.08)]"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-primary">
            Knowledge Check
          </p>
          <h3 className="font-display text-base text-foreground truncate">{quiz.topic}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
            Question
          </p>
          <p className="font-display text-sm text-foreground">
            {index + 1} <span className="text-muted-foreground">/ {total}</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-5">
        {current.acs_code && (
          <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">
            ACS {current.acs_code}
          </p>
        )}
        <p className="text-base text-foreground leading-relaxed">{current.question}</p>
      </div>

      {/* Options */}
      <div role="radiogroup" aria-label="Answer choices" className="space-y-2 mb-5">
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === current.correct;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isSelected && !isCorrect;

          return (
            <button
              key={i}
              role="radio"
              aria-checked={isSelected}
              disabled={revealed}
              onClick={() => handleSelect(i)}
              className={cn(
                "w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                !revealed && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                revealed && "cursor-default",
                showCorrect &&
                  "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--cyan-glow)/0.2)]",
                showWrong && "border-destructive bg-destructive/10",
                !showCorrect && !showWrong && isSelected && "border-primary/60 bg-primary/5",
                !showCorrect && !showWrong && !isSelected && "border-border bg-secondary/30",
              )}
            >
              <span
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center font-display text-sm tracking-wider",
                  showCorrect && "bg-primary text-primary-foreground border-primary",
                  showWrong && "bg-destructive text-destructive-foreground border-destructive",
                  !showCorrect && !showWrong && isSelected && "bg-primary/20 border-primary/60 text-primary",
                  !showCorrect && !showWrong && !isSelected && "bg-background/60 border-border text-muted-foreground",
                )}
              >
                {LETTERS[i]}
              </span>
              <span className="flex-1 text-sm text-foreground leading-relaxed pt-1.5">{opt}</span>
              {showCorrect && <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />}
              {showWrong && <XCircle className="w-5 h-5 text-destructive shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div
          className={cn(
            "rounded-xl border p-4 mb-5",
            selected === current.correct
              ? "border-primary/40 bg-primary/5"
              : "border-accent/40 bg-accent/5",
          )}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-accent" />
            <p className="font-display text-[10px] tracking-widest uppercase text-accent">
              {selected === current.correct ? "Correct" : "Explanation"}
            </p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{current.explanation}</p>
        </div>
      )}

      {/* Footer / actions */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Score so far: <span className="text-foreground font-display">{score}/{answers.length}</span>
        </p>
        {!revealed ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs tracking-widest uppercase hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs tracking-widest uppercase hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.35)] transition-all"
          >
            {index + 1 >= total ? "See Results" : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default GroundQuizCard;
