import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useReadiness, type ReadinessCategoryKey } from "@/hooks/useReadiness";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES: { key: ReadinessCategoryKey; label: string; accent: string }[] = [
  { key: "regulations", label: "Regulations", accent: "hsl(var(--cyan-glow))" },
  { key: "weather", label: "Weather", accent: "hsl(var(--amber-instrument))" },
  { key: "navigation", label: "Navigation", accent: "hsl(var(--cyan-glow))" },
  { key: "aerodynamics", label: "Aerodynamics", accent: "hsl(var(--amber-instrument))" },
];

const TrendIcon = ({ trend }: { trend: number }) => {
  if (trend > 1) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend < -1) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const ProgressTrackingPanel = () => {
  const { loading, categories } = useReadiness();

  const totalTopics = Object.values(categories).reduce((a, c) => a + c.topicTotal, 0);
  const completedTopics = Object.values(categories).reduce((a, c) => a + c.topicCompleted, 0);
  const overallTopicPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <section className="g3000-bezel rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[14px] tracking-[0.22em] uppercase text-foreground">
          Progress Tracking
        </h2>
        <span className="font-display text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
          {loading ? "—" : `${completedTopics}/${totalTopics} topics`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-display text-[11px] tracking-[0.18em] uppercase text-foreground/80">
                Overall Curriculum
              </span>
              <span className="font-display text-sm text-primary tabular-nums">
                {overallTopicPct}%
              </span>
            </div>
            <Progress value={overallTopicPct} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {CATEGORIES.map(({ key, label, accent }) => {
              const c = categories[key];
              const topicPct = c.topicTotal > 0 ? Math.round((c.topicCompleted / c.topicTotal) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                      <span className="font-display text-[11px] tracking-[0.16em] uppercase text-foreground/80">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={c.trend} />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {c.topicCompleted}/{c.topicTotal}
                      </span>
                      <span className="text-xs text-foreground tabular-nums w-9 text-right">
                        {topicPct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${topicPct}%`, background: accent, boxShadow: `0 0 8px ${accent}` }}
                    />
                  </div>
                  <div className="mt-1 font-display text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                    Readiness {c.score}% · {c.examCount} exam{c.examCount === 1 ? "" : "s"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

export default ProgressTrackingPanel;
