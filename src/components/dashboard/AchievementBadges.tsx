import { useCallback, useEffect, useState } from "react";
import { Award, Trophy, Radio, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { onDashboardRefresh } from "@/lib/dashboardEvents";

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
  radio_proficiency_top_tier: {
    label: "Radio Proficiency",
    sublabel: "Top Tier · 90%+",
    accent: "hsl(var(--hud-green))",
    icon: Radio,
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

      <div className="flex flex-wrap gap-2">
        {items.map((a) => {
          const meta = TIER_META[a.tier] ?? fallbackMeta(a.tier);
          const Icon = meta.icon;
          return (
            <div
              key={a.id}
              className="flex items-center gap-2.5 rounded-md border px-3 py-2 bg-background/40"
              style={{
                borderColor: `${meta.accent}55`,
                background: `linear-gradient(135deg, ${meta.accent}15, transparent 70%)`,
              }}
              title={`Earned ${new Date(a.earned_at).toLocaleDateString()}`}
              aria-label={`${meta.label} achievement`}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center border"
                style={{
                  borderColor: `${meta.accent}66`,
                  background: `${meta.accent}1f`,
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />
              </div>
              <div className="min-w-0">
                <div
                  className="font-display text-[11px] uppercase tracking-wider font-semibold leading-tight"
                  style={{ color: meta.accent }}
                >
                  {meta.label}
                </div>
                <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground leading-tight">
                  {meta.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementBadges;
