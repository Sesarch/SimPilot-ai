import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  useATCCategoryBySlug,
  useATCLessons,
  useATCDrills,
  useATCMastery,
  isIFREligible,
} from "@/hooks/useATCData";
import { usePilotContext } from "@/hooks/usePilotContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ATCLessonAccordion from "@/components/atc/ATCLessonAccordion";
import ATCDrillCard from "@/components/atc/ATCDrillCard";

function useBestScoresForCategory(categoryId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id && !!categoryId,
    queryKey: ["atc", "best-by-drill", user?.id, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_drill_attempts")
        .select("drill_id, score, drill:atc_drills!inner(category_id)")
        .eq("user_id", user!.id)
        .eq("drill.category_id", categoryId!);
      if (error) throw error;
      const best: Record<string, number> = {};
      for (const row of (data ?? []) as any[]) {
        const s = row.score ?? 0;
        if (best[row.drill_id] === undefined || s > best[row.drill_id]) best[row.drill_id] = s;
      }
      return best;
    },
  });
}

const ATCCategoryDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: category, isLoading: catLoading } = useATCCategoryBySlug(slug);
  const { data: lessons, isLoading: lessonsLoading } = useATCLessons(category?.id);
  const { data: drills, isLoading: drillsLoading } = useATCDrills(category?.id);
  const { data: mastery } = useATCMastery();
  const { data: bestScores } = useBestScoresForCategory(category?.id);
  const { context } = usePilotContext();

  const myMastery = useMemo(
    () => mastery?.find((m) => m.category_id === category?.id),
    [mastery, category?.id]
  );

  if (catLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!category) return <Navigate to="/atc" replace />;

  const ifrOk = isIFREligible(context.certificate_type);
  if (category.certificate_level === "IFR" && !ifrOk) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="rounded-lg border border-border bg-card/60 p-8 text-center space-y-3">
          <Lock className="h-8 w-8 text-accent mx-auto" />
          <h2 className="font-display text-lg uppercase tracking-wider">Instrument Rating required</h2>
          <p className="text-sm text-muted-foreground">
            {category.name} content is reserved for instrument-rated pilots. Update your certificate type in Account settings if you've earned your IFR rating.
          </p>
          <Link to="/atc" className="inline-block text-accent text-sm font-display uppercase tracking-wider">
            ← Back to ATC Training
          </Link>
        </div>
      </div>
    );
  }

  const totalDrills = drills?.length ?? 0;
  const passedDrills = drills
    ? drills.filter((d) => (bestScores?.[d.id] ?? 0) >= 70).length
    : 0;
  const progress = totalDrills === 0 ? 0 : Math.round((passedDrills / totalDrills) * 100);

  return (
    <>
      <Helmet>
        <title>{category.name} — ATC Training</title>
      </Helmet>

      <div className="min-h-full bg-background">
        <main className="pb-8 sm:pb-16 pt-4 sm:pt-6">
          <div className="container mx-auto px-3 sm:px-6 max-w-4xl space-y-6">
            <div>
              <Link to="/atc" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                <ArrowLeft className="h-3 w-3" /> ATC Training
              </Link>
              <h1 className="font-display text-xl sm:text-2xl text-foreground tracking-wider uppercase">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  {category.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={progress} className="h-2" />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {passedDrills}/{totalDrills} drills passed
                </span>
              </div>
            </div>

            <section>
              <h2 className="font-display text-sm sm:text-base uppercase tracking-wider text-accent mb-3">
                Lessons
              </h2>
              {lessonsLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <ATCLessonAccordion lessons={lessons ?? []} />
              )}
            </section>

            <section>
              <h2 className="font-display text-sm sm:text-base uppercase tracking-wider text-accent mb-3">
                Drills
              </h2>
              {drillsLoading ? (
                <Skeleton className="h-32" />
              ) : (drills?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No drills yet.</p>
              ) : (
                <div className="space-y-2">
                  {drills!.map((d) => (
                    <ATCDrillCard
                      key={d.id}
                      drill={d}
                      categorySlug={category.slug}
                      bestScore={bestScores?.[d.id] ?? null}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default ATCCategoryDetailPage;
