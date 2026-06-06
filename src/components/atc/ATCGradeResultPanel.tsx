import { Check, X } from "lucide-react";
import ATCMasteryRing from "./ATCMasteryRing";

export interface GradeResult {
  score: number;
  passed: boolean;
  elements_hit: string[];
  elements_missed: string[];
  feedback: string;
  correct_version: string;
}

const ATCGradeResultPanel = ({ result }: { result: GradeResult }) => {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-4">
        <ATCMasteryRing value={result.score} size={72} strokeWidth={6} label="Score" />
        <div className="min-w-0">
          <div className="font-display uppercase tracking-wider text-sm">
            {result.passed
              ? <span className="text-[hsl(var(--hud-green,142_70%_45%))]">Passed</span>
              : <span className="text-destructive">Not Yet</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pass threshold: 70
          </p>
        </div>
      </div>

      {result.elements_hit.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-display text-muted-foreground mb-1.5">
            Elements hit
          </div>
          <ul className="space-y-1">
            {result.elements_hit.map((e, i) => (
              <li key={`hit-${i}`} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-[hsl(var(--hud-green,142_70%_45%))] shrink-0 mt-0.5" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.elements_missed.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-display text-muted-foreground mb-1.5">
            Elements missed
          </div>
          <ul className="space-y-1">
            {result.elements_missed.map((e, i) => (
              <li key={`miss-${i}`} className="flex items-start gap-2 text-sm text-foreground">
                <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-wider font-display text-muted-foreground mb-1.5">
          Instructor feedback
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.feedback}</p>
      </div>

      <div className="rounded-md border border-accent/40 bg-accent/10 p-3">
        <div className="text-[10px] uppercase tracking-wider font-display text-accent mb-1.5">
          FAA-correct version
        </div>
        <p className="text-sm text-foreground font-mono leading-relaxed">
          {result.correct_version}
        </p>
      </div>
    </div>
  );
};

export default ATCGradeResultPanel;
