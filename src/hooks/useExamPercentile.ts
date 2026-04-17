import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PercentileData = {
  sample_size: number;
  at_or_below: number;
  percentile: number;
};

/**
 * Fetches an anonymized percentile rank for an exam score against the rest of
 * the SimPilot community. Returns null while loading or if the sample is too
 * small to be meaningful (< 10 peers).
 */
export const useExamPercentile = (
  examType: string | undefined,
  score: number,
  total: number,
  stressMode?: boolean
) => {
  const [data, setData] = useState<PercentileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!examType || total <= 0) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data: rows, error } = await supabase.rpc("get_exam_percentile" as any, {
        _exam_type: examType,
        _score: score,
        _total: total,
        _stress_mode: stressMode ?? null,
      });
      if (cancelled) return;
      if (error) {
        console.error("get_exam_percentile failed:", error);
        setData(null);
      } else {
        const row = Array.isArray(rows) ? rows[0] : rows;
        setData(row ? (row as PercentileData) : null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [examType, score, total, stressMode]);

  return { data, loading };
};
