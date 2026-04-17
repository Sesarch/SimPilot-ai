import { TrendingUp } from "lucide-react";
import { useExamPercentile } from "@/hooks/useExamPercentile";

interface Props {
  examType: string;
  score: number;
  total: number;
  stressMode?: boolean;
  /** Minimum cohort size before the sparkline is shown. */
  minSample?: number;
}

/**
 * Tiny inline percentile visualization for a past exam attempt.
 * Renders a 0–100 horizontal track with a marker at the user's percentile
 * rank against the anonymized SimPilot community for that exam type.
 */
export const PercentileSparkline = ({
  examType,
  score,
  total,
  stressMode,
  minSample = 5,
}: Props) => {
  const { data, loading } = useExamPercentile(examType, score, total, stressMode);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="w-20 h-1.5 rounded-full bg-secondary animate-pulse" />
      </div>
    );
  }

  if (!data || data.sample_size < minSample) return null;

  const pos = Math.max(0, Math.min(100, data.percentile));
  const isTop = pos >= 75;
  const isLow = pos < 25;
  const trackColor = isTop ? "hsl(var(--primary))" : isLow ? "hsl(var(--destructive))" : "hsl(var(--accent))";

  return (
    <div
      className="inline-flex items-center gap-2 text-[11px]"
      title={`Percentile rank vs ${data.sample_size.toLocaleString()} anonymized SimPilot exams of this type`}
    >
      <TrendingUp className={`w-3 h-3 ${isTop ? "text-primary" : isLow ? "text-destructive" : "text-accent"}`} />
      <div className="relative w-24 h-1.5 rounded-full bg-secondary overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-60"
          style={{ width: `${pos}%`, backgroundColor: trackColor }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ring-2 ring-background"
          style={{ left: `calc(${pos}% - 4px)`, backgroundColor: trackColor }}
        />
      </div>
      <span className={`tabular-nums font-display font-bold ${isTop ? "text-primary" : isLow ? "text-destructive" : "text-accent"}`}>
        {pos}%
      </span>
      <span className="text-muted-foreground">
        of {data.sample_size.toLocaleString()}
      </span>
    </div>
  );
};

export default PercentileSparkline;
