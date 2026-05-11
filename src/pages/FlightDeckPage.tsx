import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Scale, Cloud, Compass, Wind, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import ReadinessGauge from "@/components/dashboard/ReadinessGauge";
import CategoryCard from "@/components/dashboard/CategoryCard";
import SEOHead from "@/components/SEOHead";
import { useReadiness, type ReadinessCategoryKey } from "@/hooks/useReadiness";
import { Skeleton } from "@/components/ui/skeleton";
import RecentActivityPanel from "@/components/dashboard/RecentActivityPanel";
import AchievementBadges from "@/components/dashboard/AchievementBadges";
import SimStatusPanel from "@/components/dashboard/SimStatusPanel";
import RecommendedModulesPanel from "@/components/dashboard/RecommendedModulesPanel";
import ProgressTrackingPanel from "@/components/dashboard/ProgressTrackingPanel";
import UpcomingMockOralsPanel from "@/components/dashboard/UpcomingMockOralsPanel";
import {
  useAutoLogbook,
  PMDG_DEBRIEF_READY_EVENT,
  PMDG_DEBRIEF_LOADING_EVENT,
  PMDG_DEBRIEF_ERROR_EVENT,
  type PmdgDebriefReadyDetail,
  type PmdgDebriefErrorDetail,
} from "@/hooks/useAutoLogbook";
import PmdgDebriefModal, { type PmdgDebrief } from "@/components/PmdgDebriefModal";

const CATEGORY_META: Array<{
  key: ReadinessCategoryKey;
  label: string;
  icon: typeof Scale;
  accent: "cyan" | "amber";
  href: string;
}> = [
  { key: "regulations", label: "Regulations", icon: Scale, accent: "cyan", href: "/ground-school?category=regulations" },
  { key: "weather", label: "Weather", icon: Cloud, accent: "amber", href: "/ground-school?category=weather" },
  { key: "navigation", label: "Navigation", icon: Compass, accent: "cyan", href: "/ground-school?category=navigation" },
  { key: "aerodynamics", label: "Aerodynamics", icon: Wind, accent: "amber", href: "/ground-school?category=aerodynamics" },
];

const FlightDeckPage = () => {
  const { loading, overall, categories, hasData } = useReadiness();
  const trial = useTrialStatus();
  const showUpgradeCta = !trial.loading && !trial.subscribed;
  // Listen for SimPilot Bridge flight phase events and auto-draft logbook rows.
  useAutoLogbook();

  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<PmdgDebrief | null>(null);

  useEffect(() => {
    const onLoading = () => {
      setDebriefLoading(true);
      setDebriefError(null);
      setDebrief(null);
      setDebriefOpen(true);
    };
    const onReady = (e: Event) => {
      const detail = (e as CustomEvent<PmdgDebriefReadyDetail>).detail;
      if (!detail) return;
      setDebrief(detail.debrief);
      setDebriefLoading(false);
      setDebriefError(null);
      setDebriefOpen(true);
    };
    const onError = (e: Event) => {
      const detail = (e as CustomEvent<PmdgDebriefErrorDetail>).detail;
      setDebriefError(detail?.message ?? "Failed to generate debrief.");
      setDebriefLoading(false);
      setDebriefOpen(true);
    };
    window.addEventListener(PMDG_DEBRIEF_LOADING_EVENT, onLoading);
    window.addEventListener(PMDG_DEBRIEF_READY_EVENT, onReady as EventListener);
    window.addEventListener(PMDG_DEBRIEF_ERROR_EVENT, onError as EventListener);
    return () => {
      window.removeEventListener(PMDG_DEBRIEF_LOADING_EVENT, onLoading);
      window.removeEventListener(PMDG_DEBRIEF_READY_EVENT, onReady as EventListener);
      window.removeEventListener(PMDG_DEBRIEF_ERROR_EVENT, onError as EventListener);
    };
  }, []);


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
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="font-display text-3xl tracking-[0.16em] uppercase text-foreground">
              Flight Deck
            </h1>
            <p className="font-display text-[12px] tracking-[0.25em] uppercase text-muted-foreground mt-2">
              Pilot Readiness Overview
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-5 font-display text-[12px] tracking-[0.18em] uppercase text-foreground/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--cyan-glow))]" /> Live Data
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--amber-instrument))]" /> ACS Linked
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

            <div className="font-display text-[12px] tracking-[0.3em] uppercase text-foreground/80 mb-3">
              Primary Flight Display
            </div>
            {loading ? (
              <Skeleton className="w-[280px] h-[280px] rounded-full" />
            ) : (
              <ReadinessGauge score={overall} />
            )}
            {!loading && !hasData && (
              <p className="mt-4 font-display text-[12px] tracking-[0.16em] uppercase text-muted-foreground text-center max-w-md">
                Complete ground school topics or take an oral exam to populate your readiness score.
              </p>
            )}
            <div className="mt-7 grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="font-display text-[12px] tracking-[0.24em] uppercase text-foreground/80">
                  Topics Done
                </div>
                <div className="font-display text-3xl text-foreground tabular-nums mt-2">
                  {Object.values(categories).reduce((a, c) => a + c.topicCompleted, 0)}
                  <span className="text-muted-foreground text-xl ">
                    /{Object.values(categories).reduce((a, c) => a + c.topicTotal, 0)}
                  </span>
                </div>
              </div>
              <div className="border-x border-border">
                <div className="font-display text-[12px] tracking-[0.24em] uppercase text-foreground/80">
                  Exams Logged
                </div>
                <div
                  className="font-display text-3xl text-accent tabular-nums mt-2"
                  style={{ textShadow: "0 0 12px hsl(var(--amber-instrument) / 0.5)" }}
                >
                  {Object.values(categories).reduce((a, c) => a + c.examCount, 0)}
                </div>
              </div>
              <div>
                <div className="font-display text-[12px] tracking-[0.24em] uppercase text-foreground/80">
                  Overall
                </div>
                <div
                  className="font-display text-3xl text-primary tabular-nums mt-2"
                  style={{ textShadow: "0 0 12px hsl(var(--cyan-glow) / 0.5)" }}
                >
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
              href={c.href}
              score={loading ? 0 : categories[c.key].score}
              trend={loading ? undefined : categories[c.key].trend || undefined}
            />
          ))}
        </div>

        {/* Progress tracking + Upcoming mock orals */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProgressTrackingPanel />
          <UpcomingMockOralsPanel />
        </div>

        {/* Recommended modules */}
        <div className="mt-4">
          <RecommendedModulesPanel />
        </div>

        {/* Sim Telemetry */}
        <div className="mt-4">
          <SimStatusPanel />
        </div>

        {/* Achievements */}
        <div className="mt-4">
          <AchievementBadges />
        </div>

        {/* Recent Activity */}
        <div className="mt-4">
          <RecentActivityPanel />
        </div>

        {/* Footer status bar */}
        <div className="mt-6 g3000-bezel rounded-lg px-5 py-4 flex items-center justify-between font-display text-[14px] tracking-[0.22em] uppercase text-foreground">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-[hsl(var(--amber-instrument))] animate-pulse" : "bg-[hsl(var(--cyan-glow))] shadow-[0_0_8px_hsl(var(--cyan-glow))]"}`} />
            STATUS · <span className={loading ? "text-[hsl(var(--amber-instrument))]" : "text-[hsl(var(--cyan-glow))]"}>{loading ? "SYNCING" : "OK"}</span>
          </span>
          <span className="hidden sm:inline">
            DATA · <span className={hasData ? "text-[hsl(var(--cyan-glow))]" : "text-muted-foreground"}>{hasData ? "LIVE" : "AWAITING INPUT"}</span>
          </span>
          <span className="text-primary" style={{ textShadow: "0 0 12px hsl(var(--primary) / 0.5)" }}>SIMPILOT G3000 v1.0</span>
        </div>
      </div>

      <PmdgDebriefModal
        open={debriefOpen}
        onOpenChange={setDebriefOpen}
        loading={debriefLoading}
        error={debriefError}
        debrief={debrief}
      />
    </div>
  );
};

export default FlightDeckPage;
