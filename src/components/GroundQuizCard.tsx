import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Sparkles,
  RotateCcw,
  ChevronRight,
  Trophy,
  AlertTriangle,
  BookMarked,
} from "lucide-react";
import type { GroundQuiz } from "@/lib/groundQuiz";
import { cn } from "@/lib/utils";
import { citationFullName, citationIcon, parseExplanation, type ParsedCitation } from "@/lib/citations";
import { CitationModal } from "@/components/CitationModal";

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
  const [liveMessage, setLiveMessage] = useState("");

  const baseId = useId();
  const questionId = `${baseId}-question`;
  const explanationId = `${baseId}-explanation`;
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const questionHeadingRef = useRef<HTMLParagraphElement | null>(null);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const restartRef = useRef<HTMLButtonElement | null>(null);

  const current = quiz.questions[index];
  const score = useMemo(
    () => answers.reduce((acc, ans, i) => acc + (ans === quiz.questions[i].correct ? 1 : 0), 0),
    [answers, quiz.questions],
  );
  const passed = score / total >= PASS_RATIO;

  // Move focus to the question heading when a new question loads,
  // and to the results region when the quiz completes.
  useEffect(() => {
    if (completed) {
      restartRef.current?.focus();
      return;
    }
    questionHeadingRef.current?.focus();
  }, [index, completed]);

  // Move focus to the primary action when the answer is revealed so
  // keyboard users can hit Enter to advance immediately.
  useEffect(() => {
    if (revealed) primaryActionRef.current?.focus();
  }, [revealed]);

  const focusOption = useCallback((i: number) => {
    const next = ((i % 4) + 4) % 4;
    radioRefs.current[next]?.focus();
  }, []);

  const handleSelect = useCallback(
    (i: number) => {
      if (revealed) return;
      setSelected(i);
    },
    [revealed],
  );

  const handleSubmit = useCallback(() => {
    if (selected === null || revealed) return;
    setRevealed(true);
    setAnswers((prev) => [...prev, selected]);
    const correct = selected === current.correct;
    setLiveMessage(
      correct
        ? `Correct. ${current.explanation}`
        : `Incorrect. The correct answer is ${LETTERS[current.correct]}. ${current.explanation}`,
    );
  }, [selected, revealed, current]);

  const handleNext = useCallback(() => {
    if (index + 1 >= total) {
      setCompleted(true);
      const finalAnswers = answers;
      const finalScore = finalAnswers.reduce(
        (acc, ans, i) => acc + (ans === quiz.questions[i].correct ? 1 : 0),
        0,
      );
      const finalPassed = finalScore / total >= PASS_RATIO;
      setLiveMessage(
        `Quiz complete. You scored ${finalScore} out of ${total}. ${finalPassed ? "Topic passed." : "Review recommended."}`,
      );
      onComplete?.({ score: finalScore, total, passed: finalPassed, answers: finalAnswers });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setLiveMessage(`Question ${index + 2} of ${total}.`);
  }, [index, total, answers, quiz.questions, onComplete]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setCompleted(false);
    setLiveMessage(`Quiz restarted. Question 1 of ${total}.`);
    onRetry?.();
  }, [total, onRetry]);

  // Radiogroup keyboard model: arrow keys move focus + selection,
  // Home/End jump to first/last, Space/Enter select, A–D and 1–4 hotkeys.
  const handleRadioKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (revealed) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight": {
        e.preventDefault();
        const next = (i + 1) % 4;
        setSelected(next);
        focusOption(next);
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        e.preventDefault();
        const next = (i + 3) % 4;
        setSelected(next);
        focusOption(next);
        break;
      }
      case "Home": {
        e.preventDefault();
        setSelected(0);
        focusOption(0);
        break;
      }
      case "End": {
        e.preventDefault();
        setSelected(3);
        focusOption(3);
        break;
      }
      case " ":
      case "Spacebar": {
        e.preventDefault();
        setSelected(i);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (selected === null) {
          setSelected(i);
        } else {
          handleSubmit();
        }
        break;
      }
      default:
        break;
    }
  };

  // Card-level hotkeys: 1–4 / A–D pick an option; Enter submits / advances.
  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (completed) return;
    const target = e.target as HTMLElement;
    const isEditing = target.matches("input, textarea, select, [contenteditable='true']");
    if (isEditing) return;

    const key = e.key.toLowerCase();
    const letterIdx = ["a", "b", "c", "d"].indexOf(key);
    const numberIdx = ["1", "2", "3", "4"].indexOf(key);
    const optionIdx = letterIdx !== -1 ? letterIdx : numberIdx;

    if (optionIdx !== -1 && !revealed) {
      e.preventDefault();
      setSelected(optionIdx);
      focusOption(optionIdx);
      return;
    }
    if (e.key === "Enter") {
      // Don't hijack Enter when focus is on a button — its own handler runs.
      if (target.tagName === "BUTTON") return;
      e.preventDefault();
      if (revealed) handleNext();
      else handleSubmit();
    }
  };

  if (completed) {
    return (
      <div
        role="region"
        aria-label="Quiz results"
        aria-live="polite"
        className={cn(
          "rounded-2xl border bg-gradient-to-br from-card via-card to-secondary/30 p-6 shadow-[0_0_40px_hsl(var(--cyan-glow)/0.08)]",
          passed ? "border-primary/40" : "border-destructive/40",
        )}
      >
        <span className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </span>
        <div className="flex items-start gap-4 mb-5">
          <div
            aria-hidden="true"
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
          <div className="text-right shrink-0" aria-label={`Score: ${score} out of ${total}, ${Math.round((score / total) * 100)} percent`}>
            <div className="font-display text-3xl text-foreground leading-none" aria-hidden="true">
              {score}
              <span className="text-muted-foreground text-xl">/{total}</span>
            </div>
            <p className="text-[10px] font-display tracking-widest uppercase text-muted-foreground mt-1" aria-hidden="true">
              {Math.round((score / total) * 100)}%
            </p>
          </div>
        </div>

        <ol className="space-y-2 mb-5" aria-label="Per-question breakdown">
          {quiz.questions.map((q, i) => {
            const ans = answers[i];
            const ok = ans === q.correct;
            return (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
              >
                {ok ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span className="sr-only">{ok ? "Correct." : "Incorrect."}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/90 line-clamp-2">{q.question}</p>
                  {!ok && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Correct: <span className="text-foreground">{LETTERS[q.correct]}. {q.options[q.correct]}</span>
                    </p>
                  )}
                </div>
                {q.acs_code && (
                  <span className="font-display text-[10px] tracking-widest text-muted-foreground shrink-0" aria-label={`ACS code ${q.acs_code}`}>
                    {q.acs_code}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {passed
              ? "Topic marked complete in your Flight Deck."
              : "Pass 2 of 3 to mark this topic complete. Review and try again."}
          </p>
          <button
            ref={restartRef}
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-xs font-display tracking-widest uppercase text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
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
      aria-label={`${quiz.topic} knowledge check, question ${index + 1} of ${total}`}
      onKeyDown={handleCardKeyDown}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-[0_0_40px_hsl(var(--cyan-glow)/0.08)]"
    >
      {/* Polite live region — narrates correctness, advances, and completion. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </span>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center" aria-hidden="true">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-primary">
            Knowledge Check
          </p>
          <h3 className="font-display text-base text-foreground truncate">{quiz.topic}</h3>
        </div>
        <div className="text-right shrink-0" aria-label={`Question ${index + 1} of ${total}`}>
          <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground" aria-hidden="true">
            Question
          </p>
          <p className="font-display text-sm text-foreground" aria-hidden="true">
            {index + 1} <span className="text-muted-foreground">/ {total}</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + (revealed ? 1 : 0)}
        aria-valuetext={`Question ${index + 1} of ${total}`}
        className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden mb-5"
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-5">
        {current.acs_code && (
          <p className="font-display text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5" aria-label={`ACS code ${current.acs_code}`}>
            ACS {current.acs_code}
          </p>
        )}
        <p
          ref={questionHeadingRef}
          id={questionId}
          tabIndex={-1}
          className="text-base text-foreground leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded-md"
        >
          {current.question}
        </p>
      </div>

      {/* Options — WAI-ARIA radiogroup with roving tabindex */}
      <div
        role="radiogroup"
        aria-labelledby={questionId}
        aria-describedby={revealed ? explanationId : undefined}
        className="space-y-2 mb-5"
      >
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === current.correct;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isSelected && !isCorrect;
          // Roving tabindex: only the checked (or first if none) option is in the tab order.
          const isTabStop = selected === null ? i === 0 : isSelected;

          return (
            <button
              key={i}
              ref={(el) => {
                radioRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${LETTERS[i]}: ${opt}${showCorrect ? ", correct answer" : showWrong ? ", incorrect" : ""}`}
              tabIndex={revealed ? -1 : isTabStop ? 0 : -1}
              disabled={revealed}
              aria-disabled={revealed}
              onClick={() => handleSelect(i)}
              onKeyDown={(e) => handleRadioKeyDown(e, i)}
              className={cn(
                "w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
                aria-hidden="true"
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
              {showCorrect && <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" aria-hidden="true" />}
              {showWrong && <XCircle className="w-5 h-5 text-destructive shrink-0 mt-1" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (() => {
        const isRight = selected === current.correct;
        const { prose, citations } = parseExplanation(current.explanation);
        return (
          <div
            id={explanationId}
            role="note"
            className={cn(
              "rounded-xl border overflow-hidden mb-5",
              isRight ? "border-primary/40 bg-primary/5" : "border-accent/40 bg-accent/5",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between gap-2 px-4 py-2 border-b",
                isRight ? "bg-primary/10 border-primary/30" : "bg-accent/10 border-accent/30",
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className={cn("w-4 h-4", isRight ? "text-primary" : "text-accent")} aria-hidden="true" />
                <p
                  className={cn(
                    "font-display text-[10px] tracking-[0.25em] uppercase",
                    isRight ? "text-primary" : "text-accent",
                  )}
                >
                  {isRight ? "Correct" : "Explanation"}
                </p>
              </div>
              {citations.length > 0 && (
                <p className="font-display text-[9px] tracking-widest uppercase text-muted-foreground hidden sm:block">
                  {citations.length} {citations.length === 1 ? "Reference" : "References"}
                </p>
              )}
            </div>

            <div className="p-4 space-y-3">
              {prose && (
                <p className="text-sm text-foreground/90 leading-relaxed">{prose}</p>
              )}

              {citations.length > 0 && (
                <div
                  aria-label="Cited references"
                  className="rounded-lg border border-border/70 bg-background/40 p-3"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookMarked className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    <p className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                      Sources
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {citations.map((c, i) => {
                      const Icon = citationIcon(c.kind);
                      return (
                        <li key={`${c.kind}-${c.label}-${i}`}>
                          <span
                            title={citationFullName(c.kind)}
                            aria-label={`${citationFullName(c.kind)}: ${c.label}`}
                            className={cn(
                              "inline-flex items-stretch rounded-md border overflow-hidden font-mono text-[11px] leading-none",
                              "border-primary/40 bg-background/70 text-foreground",
                              "shadow-[0_0_10px_hsl(var(--cyan-glow)/0.08)]",
                            )}
                          >
                            <span className="flex items-center gap-1 px-1.5 py-1 bg-primary/15 text-primary border-r border-primary/30">
                              <Icon className="w-3 h-3" aria-hidden="true" />
                              <span className="font-display tracking-widest text-[9px] uppercase">{c.kind}</span>
                            </span>
                            <span className="px-2 py-1 font-medium">{c.label.replace(/^(?:14\s*CFR|FAR|AIM|PHAK|AFH|IFH|AC|ACS|POH)\s*/i, "")}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Footer / actions */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground" aria-label={`Score so far: ${score} of ${answers.length} answered`}>
          Score so far: <span className="text-foreground font-display">{score}/{answers.length}</span>
          <span className="sr-only"> — Tip: use arrow keys, A–D, or 1–4 to choose; press Enter to submit.</span>
        </p>
        {!revealed ? (
          <button
            ref={primaryActionRef}
            type="button"
            onClick={handleSubmit}
            disabled={selected === null}
            aria-disabled={selected === null}
            aria-keyshortcuts="Enter"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs tracking-widest uppercase hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Submit Answer
          </button>
        ) : (
          <button
            ref={primaryActionRef}
            type="button"
            onClick={handleNext}
            aria-keyshortcuts="Enter"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs tracking-widest uppercase hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.35)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {index + 1 >= total ? "See Results" : "Next Question"}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export default GroundQuizCard;
