import { TrendingUp, Trophy } from "lucide-react";
import { useExamPercentile } from "@/hooks/useExamPercentile";

interface Props {
  examType: string;
  score: number;
  total: number;
  stressMode?: boolean;
  /** Minimum cohort size before the sparkline is shown. */
  minSample?: number;
  /** When true, renders an inline Top 5/10/25% trophy badge for exceptional percentiles. */
  showTopTier?: boolean;
  /** Minimum cohort size before the top-tier badge is shown (defaults to 10). */
  topTierMinSample?: number;
}

type TopTier = { label: string; classes: string; iconClass: string } | null;

const getTopTier = (percentile: number): TopTier => {
  if (percentile >= 95) {
    return {
      label: "Top 5%",
      classes:
        "bg-gradient-to-r from-[hsl(var(--amber-instrument)/0.25)] to-[hsl(var(--amber-instrument)/0.1)] text-[hsl(var(--amber-instrument))] border-[hsl(var(--amber-instrument)/0.6)] shadow-[0_0_14px_hsl(var(--amber-instrument)/0.5)]",
      iconClass: "drop-shadow-[0_0_4px_hsl(var(--amber-instrument)/0.9)]",
    };
  }
  if (percentile >= 90) {
    return {
      label: "Top 10%",
      classes:
        "bg-gradient-to-r from-[hsl(var(--amber-instrument)/0.18)] to-[hsl(var(--amber-instrument)/0.05)] text-[hsl(var(--amber-instrument))] border-[hsl(var(--amber-instrument)/0.5)] shadow-[0_0_10px_hsl(var(--amber-instrument)/0.35)]",
      iconClass: "drop-shadow-[0_0_3px_hsl(var(--amber-instrument)/0.7)]",
    };
  }
  if (percentile >= 75) {
    return {
      label: "Top 25%",
      classes: "bg-primary/10 text-primary border-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.3)]",
      iconClass: "drop-shadow-[0_0_2px_hsl(var(--primary)/0.6)]",
    };
  }
  return null;
};

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
  showTopTier = false,
  topTierMinSample = 10,
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
  const topTier = showTopTier && data.sample_size >= topTierMinSample ? getTopTier(pos) : null;

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
      {topTier && (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-display font-bold uppercase tracking-widest animate-[pulse_3s_ease-in-out_infinite] ${topTier.classes}`}
          title={`Achievement: ${topTier.label} of anonymized SimPilot exams of this type`}
          aria-label={`Achievement: ${topTier.label}`}
        >
          <Trophy className={`w-2.5 h-2.5 ${topTier.iconClass}`} />
          {topTier.label}
        </span>
      )}
    </div>
  );
};

export default PercentileSparkline;
