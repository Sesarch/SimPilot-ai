import { Scale, Cloud, Compass, Wind } from "lucide-react";
import ReadinessGauge from "@/components/dashboard/ReadinessGauge";
import CategoryCard from "@/components/dashboard/CategoryCard";
import SEOHead from "@/components/SEOHead";
import { useReadiness, type ReadinessCategoryKey } from "@/hooks/useReadiness";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_META: Array<{
  key: ReadinessCategoryKey;
  label: string;
  icon: typeof Scale;
  accent: "cyan" | "amber";
}> = [
  { key: "regulations", label: "Regulations", icon: Scale, accent: "cyan" },
  { key: "weather", label: "Weather", icon: Cloud, accent: "amber" },
  { key: "navigation", label: "Navigation", icon: Compass, accent: "cyan" },
  { key: "aerodynamics", label: "Aerodynamics", icon: Wind, accent: "amber" },
];

const FlightDeckPage = () => {
  const { loading, overall, categories, hasData } = useReadiness();

  return (
    <div className="g3000-grid min-h-full">
      <SEOHead
        title="Flight Deck — SimPilot Avionics Suite"
        description="Your readiness gauge and category proficiency at a glance."
        keywords="pilot dashboard, readiness, ACS, ground school progress"
        canonical="/dashboard"
        noIndex
      />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 lg:py-10">
        {/* Header strip */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold tracking-[0.18em] uppercase text-foreground">
              Flight Deck
            </h1>
            <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">
              Pilot Readiness Overview
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4 font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--cyan-glow))]" /> Live Data
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--amber-instrument))]" /> ACS Linked
            </div>
          </div>
        </div>

        {/* Main gauge + side stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-3 g3000-bezel g3000-glow-cyan rounded-xl p-6 sm:p-10 flex flex-col items-center relative overflow-hidden">
            {/* corner ticks */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/60" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/60" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/60" />

            <div className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">
              Primary Flight Display
            </div>
            {loading ? (
              <Skeleton className="w-[280px] h-[280px] rounded-full" />
            ) : (
              <ReadinessGauge score={overall} />
            )}
            {!loading && !hasData && (
              <p className="mt-4 font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground/80 text-center max-w-md">
                Complete ground school topics or take an oral exam to populate your readiness score.
              </p>
            )}
            <div className="mt-6 grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  Topics Done
                </div>
                <div className="font-display text-lg font-bold text-foreground tabular-nums">
                  {Object.values(categories).reduce((a, c) => a + c.topicCompleted, 0)}
                  <span className="text-muted-foreground text-sm">
                    /{Object.values(categories).reduce((a, c) => a + c.topicTotal, 0)}
                  </span>
                </div>
              </div>
              <div className="border-x border-border">
                <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  Exams Logged
                </div>
                <div className="font-display text-lg font-bold text-accent tabular-nums">
                  {Object.values(categories).reduce((a, c) => a + c.examCount, 0)}
                </div>
              </div>
              <div>
                <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  Overall
                </div>
                <div className="font-display text-lg font-bold text-primary tabular-nums">
                  {loading ? "—" : `${overall}%`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORY_META.map((c) => (
            <CategoryCard
              key={c.key}
              icon={c.icon}
              label={c.label}
              accent={c.accent}
              score={loading ? 0 : categories[c.key].score}
              trend={loading ? undefined : categories[c.key].trend || undefined}
            />
          ))}
        </div>

        {/* Footer status bar */}
        <div className="mt-6 g3000-bezel rounded-lg px-4 py-2 flex items-center justify-between font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          <span>STATUS · {loading ? "SYNCING" : "OK"}</span>
          <span className="hidden sm:inline">DATA · {hasData ? "LIVE" : "AWAITING INPUT"}</span>
          <span className="text-primary">SIMPILOT G3000 v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default FlightDeckPage;
