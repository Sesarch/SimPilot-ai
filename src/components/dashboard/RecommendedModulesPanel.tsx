import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReadiness, TOPIC_TO_CATEGORY, type ReadinessCategoryKey } from "@/hooks/useReadiness";
import { LESSON_AREAS } from "@/data/groundSchoolLessons";
import { Skeleton } from "@/components/ui/skeleton";

interface Recommendation {
  topicId: string;
  title: string;
  acs: string;
  description: string;
  icon: string;
  category: ReadinessCategoryKey;
  categoryScore: number;
  reason: string;
}

const CATEGORY_LABEL: Record<ReadinessCategoryKey, string> = {
  regulations: "Regulations",
  weather: "Weather",
  navigation: "Navigation",
  aerodynamics: "Aerodynamics",
};

const RecommendedModulesPanel = () => {
  const { user } = useAuth();
  const { loading, categories, hasData } = useReadiness();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setProgressLoading(false);
        return;
      }
      const { data } = await supabase
        .from("topic_progress")
        .select("topic_id, completed")
        .eq("user_id", user.id);
      if (cancelled) return;
      const set = new Set<string>();
      for (const row of data ?? []) {
        if (row.completed) set.add(row.topic_id);
      }
      setCompletedIds(set);
      setProgressLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const recommendations = useMemo<Recommendation[]>(() => {
    if (loading || progressLoading) return [];

    // Sort categories ascending by score (weakest first)
    const orderedCats = (Object.keys(categories) as ReadinessCategoryKey[]).sort(
      (a, b) => categories[a].score - categories[b].score
    );

    const recs: Recommendation[] = [];
    const seen = new Set<string>();

    for (const cat of orderedCats) {
      for (const lesson of LESSON_AREAS) {
        if (TOPIC_TO_CATEGORY[lesson.id] !== cat) continue;
        if (completedIds.has(lesson.id)) continue;
        if (seen.has(lesson.id)) continue;
        seen.add(lesson.id);
        recs.push({
          topicId: lesson.id,
          title: lesson.title,
          acs: lesson.acs,
          description: lesson.description,
          icon: lesson.icon,
          category: cat,
          categoryScore: categories[cat].score,
          reason:
            categories[cat].score < 50
              ? `Strengthen ${CATEGORY_LABEL[cat]} (${categories[cat].score}%)`
              : `Next up in ${CATEGORY_LABEL[cat]}`,
        });
        if (recs.length >= 6) break;
      }
      if (recs.length >= 6) break;
    }
    return recs;
  }, [loading, progressLoading, categories, completedIds]);

  const isLoading = loading || progressLoading;

  return (
    <section className="g3000-bezel rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-display text-[14px] font-bold tracking-[0.22em] uppercase text-foreground">
            Recommended Modules
          </h2>
        </div>
        <Link
          to="/ground-school"
          className="font-display text-[11px] font-semibold tracking-[0.18em] uppercase text-primary hover:underline flex items-center gap-1"
        >
          All modules <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <p className="font-display text-[12px] tracking-[0.16em] uppercase text-muted-foreground">
          {hasData
            ? "All ground school topics complete. Take a mock oral to keep sharp."
            : "Start any ground school topic to get personalized recommendations."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendations.map((r) => (
            <Link
              key={r.topicId}
              to={`/ground-school?topic=${encodeURIComponent(r.topicId)}`}
              className="group relative rounded-lg border border-border bg-card/40 hover:bg-card/70 hover:border-primary/60 transition-colors p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl leading-none">{r.icon}</span>
                <span className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-primary">
                  {r.acs}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground line-clamp-2">{r.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-accent">
                  {r.reason}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedModulesPanel;
