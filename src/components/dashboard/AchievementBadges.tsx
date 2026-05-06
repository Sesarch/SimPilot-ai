import { useCallback, useEffect, useState } from "react";
import { Award, Trophy, Radio, Gem, Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { onDashboardRefresh } from "@/lib/dashboardEvents";

const EXAM_LABELS: Record<string, string> = {
  atc_phraseology: "ATC Phraseology",
  oral_exam: "Oral Exam",
  written_exam: "Written Exam",
};

const formatExamType = (t: string | null) =>
  t ? EXAM_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "General";

type Achievement = {
  id: string;
  tier: string;
  exam_type: string | null;
  percentile: number | null;
  earned_at: string;
};

type BadgeMeta = {
  label: string;
  sublabel: string;
  accent: string; // CSS hsl(var(...))
  icon: typeof Award;
};

const TIER_META: Record<string, BadgeMeta> = {
  radio_proficiency_perfect: {
    label: "Perfect Score",
    sublabel: "Flawless Phraseology · 100%",
    accent: "hsl(280 90% 70%)", // distinct violet — rarest tier
    icon: Gem,
  },
  radio_proficiency_top_tier: {
    label: "Radio Proficiency",
    sublabel: "Top Tier · 90%+",
    accent: "hsl(var(--hud-green))",
    icon: Radio,
  },
  radio_streak_3: {
    label: "On a Roll",
    sublabel: "3 ATC PASSes in a Row",
    accent: "hsl(18 90% 60%)", // warm orange/flame
    icon: Flame,
  },
  radio_streak_10: {
    label: "Iron Mic",
    sublabel: "10 ATC PASSes in a Row",
    accent: "hsl(45 95% 58%)", // rare gold flame
    icon: Flame,
  },
  comeback_kid: {
    label: "Comeback Kid",
    sublabel: "PASS After a FAIL",
    accent: "hsl(195 90% 60%)", // resilient sky blue
    icon: Sparkles,
  },
  top_5_percent: {
    label: "Top 5%",
    sublabel: "Checkride Cohort",
    accent: "hsl(var(--cyan-glow))",
    icon: Trophy,
  },
  top_10_percent: {
    label: "Top 10%",
    sublabel: "Checkride Cohort",
    accent: "hsl(var(--amber-instrument))",
    icon: Award,
  },
};

const fallbackMeta = (tier: string): BadgeMeta => ({
  label: tier.replace(/[_-]/g, " "),
  sublabel: "Achievement",
  accent: "hsl(var(--primary))",
  icon: Award,
});

const AchievementBadges = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Achievement[] | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const { data } = await supabase
      .from("user_achievements")
      .select("id, tier, exam_type, percentile, earned_at")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(8);
    setItems((data ?? []) as Achievement[]);
  }, [user]);

  useEffect(() => {
    void fetchAchievements();
    const off = onDashboardRefresh(() => { void fetchAchievements(); });
    return () => { off(); };
  }, [fetchAchievements]);

  // Hide entirely until data is loaded; only render the panel if user has earned something.
  if (items === null) {
    return (
      <div className="g3000-bezel rounded-lg p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 w-32 rounded-md" />
          <Skeleton className="h-12 w-32 rounded-md" />
        </div>
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="g3000-bezel rounded-lg p-4 sm:p-5 relative overflow-hidden">
      {/* corner ticks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-primary" />
          <h2 className="font-display text-[11px] tracking-[0.3em] uppercase text-foreground">
            Achievements
          </h2>
        </div>
        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
          {items.length} Earned
        </span>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((a) => {
            const meta = TIER_META[a.tier] ?? fallbackMeta(a.tier);
            const Icon = meta.icon;
            const earnedDate = new Date(a.earned_at);
            const earnedFull = earnedDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const earnedTime = earnedDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <div
                    className="group relative flex items-center gap-3 rounded-md border px-3 py-2.5 overflow-hidden transition-all hover:scale-[1.02] cursor-default"
                    style={{
                      borderColor: `${meta.accent}66`,
                      background: `linear-gradient(135deg, ${meta.accent}22 0%, hsl(var(--background) / 0.6) 45%, ${meta.accent}10 100%)`,
                      boxShadow: `inset 0 1px 0 0 ${meta.accent}40, inset 0 -1px 0 0 hsl(var(--background) / 0.6), 0 0 12px -4px ${meta.accent}55`,
                    }}
                    aria-label={`${meta.label} achievement`}
                  >
                    {/* metallic sheen */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        background: `linear-gradient(115deg, transparent 30%, ${meta.accent}30 48%, transparent 65%)`,
                      }}
                    />
                    {/* corner ticks */}
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l" style={{ borderColor: `${meta.accent}aa` }} />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r" style={{ borderColor: `${meta.accent}aa` }} />

                    <div
                      className="relative w-9 h-9 rounded-md flex items-center justify-center border shrink-0"
                      style={{
                        borderColor: `${meta.accent}88`,
                        background: `radial-gradient(circle at 30% 25%, ${meta.accent}55, ${meta.accent}10 70%)`,
                        boxShadow: `inset 0 1px 0 ${meta.accent}99, 0 0 8px -2px ${meta.accent}88`,
                      }}
                    >
                      <Icon className="w-4 h-4 drop-shadow" style={{ color: meta.accent, filter: `drop-shadow(0 0 3px ${meta.accent}aa)` }} />
                    </div>
                    <div className="min-w-0 relative">
                      <div
                        className="font-display text-[11px] uppercase tracking-wider leading-tight truncate"
                        style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}55` }}
                      >
                        {meta.label}
                      </div>
                      <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground leading-tight mt-0.5 truncate">
                        {meta.sublabel}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[240px] p-0 overflow-hidden border"
                  style={{
                    borderColor: `${meta.accent}66`,
                    boxShadow: `0 0 16px -4px ${meta.accent}88`,
                  }}
                >
                  <div
                    className="px-3 py-2 border-b"
                    style={{
                      borderColor: `${meta.accent}33`,
                      background: `linear-gradient(135deg, ${meta.accent}25, transparent 80%)`,
                    }}
                  >
                    <div
                      className="font-display text-[11px] uppercase tracking-wider "
                      style={{ color: meta.accent }}
                    >
                      {meta.label}
                    </div>
                    <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
                      {meta.sublabel}
                    </div>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-display uppercase tracking-wider">
                      <span className="text-muted-foreground">Discipline</span>
                      <span className="text-foreground ">{formatExamType(a.exam_type)}</span>
                    </div>
                    {a.percentile !== null && (
                      <div className="flex items-center justify-between gap-3 text-[10px] font-display uppercase tracking-wider">
                        <span className="text-muted-foreground">Percentile</span>
                        <span className="text-foreground ">{a.percentile}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-[10px] font-display uppercase tracking-wider">
                      <span className="text-muted-foreground">Earned</span>
                      <span className="text-foreground ">{earnedFull}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[10px] font-display uppercase tracking-wider">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-foreground ">{earnedTime}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default AchievementBadges;
