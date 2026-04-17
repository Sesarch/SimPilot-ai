import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LESSON_AREAS } from "@/data/groundSchoolLessons";

export type ReadinessCategoryKey = "regulations" | "weather" | "navigation" | "aerodynamics";

/** Map every ground-school lesson topic_id to one of the 4 ACS categories. */
export const TOPIC_TO_CATEGORY: Record<string, ReadinessCategoryKey> = {
  // Regulations bucket — rules, airworthiness, ADM, human factors, airspace, ATC, emergencies
  regulations: "regulations",
  airworthiness: "regulations",
  adm: "regulations",
  "human-factors": "regulations",
  "airport-ops": "regulations",
  "airspace-tfrs": "regulations",
  "atc-comms": "regulations",
  emergencies: "regulations",
  "night-ops": "regulations",
  // Weather bucket
  weather: "weather",
  // Navigation bucket — nav, planning, radio nav, instruments
  navigation: "navigation",
  "xc-planning": "navigation",
  "radio-navigation": "navigation",
  instruments: "navigation",
  // Aerodynamics bucket — performance, aero, systems, maneuvers, W&B
  performance: "aerodynamics",
  aerodynamics: "aerodynamics",
  systems: "aerodynamics",
  "flight-maneuvers": "aerodynamics",
  "weight-balance-advanced": "aerodynamics",
};

/** Map exam_type strings to a category. Unknown → regulations (oral exams broadly cover regs). */
const EXAM_TYPE_TO_CATEGORY = (examType: string): ReadinessCategoryKey => {
  const t = examType.toLowerCase();
  if (t.includes("weather") || t.includes("wx")) return "weather";
  if (t.includes("nav") || t.includes("xc") || t.includes("plan")) return "navigation";
  if (t.includes("aero") || t.includes("perf") || t.includes("system") || t.includes("maneuver"))
    return "aerodynamics";
  return "regulations";
};

interface CategoryData {
  score: number;
  trend: number;
  topicTotal: number;
  topicCompleted: number;
  examCount: number;
}

export interface ReadinessData {
  loading: boolean;
  overall: number;
  categories: Record<ReadinessCategoryKey, CategoryData>;
  hasData: boolean;
}

const EMPTY_CAT: CategoryData = { score: 0, trend: 0, topicTotal: 0, topicCompleted: 0, examCount: 0 };

const buildCategoryTotals = () => {
  const totals: Record<ReadinessCategoryKey, number> = {
    regulations: 0,
    weather: 0,
    navigation: 0,
    aerodynamics: 0,
  };
  for (const lesson of LESSON_AREAS) {
    const cat = TOPIC_TO_CATEGORY[lesson.id];
    if (cat) totals[cat] += 1;
  }
  return totals;
};

export const useReadiness = (): ReadinessData => {
  const { user } = useAuth();
  const [data, setData] = useState<ReadinessData>({
    loading: true,
    overall: 0,
    categories: {
      regulations: { ...EMPTY_CAT },
      weather: { ...EMPTY_CAT },
      navigation: { ...EMPTY_CAT },
      aerodynamics: { ...EMPTY_CAT },
    },
    hasData: false,
  });

  useEffect(() => {
    if (!user) {
      setData((d) => ({ ...d, loading: false }));
      return;
    }

    let cancelled = false;
    (async () => {
      const [{ data: progress }, { data: exams }] = await Promise.all([
        supabase
          .from("topic_progress")
          .select("topic_id, completed")
          .eq("user_id", user.id),
        supabase
          .from("exam_scores")
          .select("exam_type, score, total_questions, result, created_at")
          .eq("user_id", user.id)
          .neq("result", "INCOMPLETE")
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      if (cancelled) return;

      const totals = buildCategoryTotals();
      const completedByCat: Record<ReadinessCategoryKey, number> = {
        regulations: 0,
        weather: 0,
        navigation: 0,
        aerodynamics: 0,
      };
      for (const row of progress ?? []) {
        if (!row.completed) continue;
        const cat = TOPIC_TO_CATEGORY[row.topic_id];
        if (cat) completedByCat[cat] += 1;
      }

      // Group recent exams (last 5 per category for current avg, 5 before that for trend baseline)
      const examsByCat: Record<ReadinessCategoryKey, number[]> = {
        regulations: [],
        weather: [],
        navigation: [],
        aerodynamics: [],
      };
      for (const e of exams ?? []) {
        if (!e.total_questions) continue;
        const pct = Math.round((e.score / e.total_questions) * 100);
        examsByCat[EXAM_TYPE_TO_CATEGORY(e.exam_type)].push(pct);
      }

      const cats: Record<ReadinessCategoryKey, CategoryData> = {} as never;
      const keys: ReadinessCategoryKey[] = ["regulations", "weather", "navigation", "aerodynamics"];
      for (const key of keys) {
        const topicTotal = totals[key];
        const topicCompleted = completedByCat[key];
        const topicPct = topicTotal > 0 ? (topicCompleted / topicTotal) * 100 : 0;

        const recent = examsByCat[key].slice(0, 5);
        const baseline = examsByCat[key].slice(5, 10);
        const examAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
        const baseAvg = baseline.length ? baseline.reduce((a, b) => a + b, 0) / baseline.length : 0;

        // Blend: if exams exist, 60% exams + 40% topics; otherwise topics only.
        const score = recent.length
          ? Math.round(examAvg * 0.6 + topicPct * 0.4)
          : Math.round(topicPct);

        const trend = recent.length && baseline.length ? Math.round(examAvg - baseAvg) : 0;

        cats[key] = {
          score,
          trend,
          topicTotal,
          topicCompleted,
          examCount: examsByCat[key].length,
        };
      }

      const overall = Math.round((cats.regulations.score + cats.weather.score + cats.navigation.score + cats.aerodynamics.score) / 4);
      const hasData = (progress?.length ?? 0) > 0 || (exams?.length ?? 0) > 0;

      setData({ loading: false, overall, categories: cats, hasData });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return data;
};
