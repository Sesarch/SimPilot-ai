import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { useATCCategories, useATCDrills, useATCMastery, isIFREligible } from "@/hooks/useATCData";
import { usePilotContext } from "@/hooks/usePilotContext";
import ATCCategoryCard from "@/components/atc/ATCCategoryCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/** Fetch drill counts per category in a single query. */
function useDrillCounts() {
  return useQuery({
    queryKey: ["atc", "drill-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("atc_drills").select("category_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { category_id: string }[]) {
        counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

const ATCCategoriesPage = () => {
  const { data: categories, isLoading } = useATCCategories();
  const { data: mastery } = useATCMastery();
  const { data: drillCounts } = useDrillCounts();
  const { context } = usePilotContext();

  const masteryByCat = useMemo(() => {
    const m: Record<string, { score: number; attempted: number }> = {};
    for (const row of mastery ?? []) {
      m[row.category_id] = { score: row.mastery_score ?? 0, attempted: row.drills_attempted ?? 0 };
    }
    return m;
  }, [mastery]);

  const ifrOk = isIFREligible(context.certificate_type);

  return (
    <>
      <Helmet>
        <title>ATC Training — SimPilot.AI</title>
        <meta name="description" content="Master radio communications step by step with structured ATC training drills." />
      </Helmet>

      <div className="min-h-full bg-background">
        <main className="pb-8 sm:pb-16 pt-4 sm:pt-6">
          <div className="container mx-auto px-3 sm:px-6 max-w-5xl">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                  ATC Suite
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <h1 className="font-display text-xl sm:text-2xl text-foreground tracking-wider">
                ATC <span className="text-accent">TRAINING</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                Master radio communications step by step.
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(categories ?? []).map((cat) => {
                  const m = masteryByCat[cat.id];
                  const total = drillCounts?.[cat.id] ?? 0;
                  const requiresIFR = cat.certificate_level === "IFR";
                  const locked = requiresIFR && !ifrOk;
                  return (
                    <ATCCategoryCard
                      key={cat.id}
                      category={cat}
                      masteryScore={m?.score ?? 0}
                      drillsAttempted={m?.attempted ?? 0}
                      totalDrills={total}
                      locked={locked}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ATCCategoriesPage;
