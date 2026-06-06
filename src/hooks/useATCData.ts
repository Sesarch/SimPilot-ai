import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ATCCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  certificate_level: string;
}

export interface ATCLesson {
  id: string;
  category_id: string;
  title: string;
  content_markdown: string;
  example_transmission: string | null;
  example_response: string | null;
  display_order: number;
  certificate_level: string;
}

export interface ATCDrill {
  id: string;
  category_id: string;
  lesson_id: string | null;
  title: string;
  situation: string;
  controller_transmission: string | null;
  expected_phraseology: string;
  key_elements: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | string;
  display_order: number;
  certificate_level: string;
}

export interface ATCMastery {
  category_id: string;
  mastery_score: number;
  drills_attempted: number;
  drills_passed: number;
}

export interface ATCAttempt {
  id: string;
  drill_id: string;
  score: number;
  student_response: string;
  elements_hit: string[] | null;
  elements_missed: string[] | null;
  feedback: string | null;
  correct_version: string | null;
  created_at: string;
}

export function useATCCategories() {
  return useQuery({
    queryKey: ["atc", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ATCCategory[];
    },
  });
}

export function useATCCategoryBySlug(slug: string | undefined) {
  return useQuery({
    enabled: !!slug,
    queryKey: ["atc", "category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_categories")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as ATCCategory | null;
    },
  });
}

export function useATCLessons(categoryId: string | undefined) {
  return useQuery({
    enabled: !!categoryId,
    queryKey: ["atc", "lessons", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_lessons")
        .select("*")
        .eq("category_id", categoryId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ATCLesson[];
    },
  });
}

export function useATCDrills(categoryId: string | undefined) {
  return useQuery({
    enabled: !!categoryId,
    queryKey: ["atc", "drills", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_drills")
        .select("*")
        .eq("category_id", categoryId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((d) => ({
        ...d,
        key_elements: Array.isArray(d.key_elements) ? d.key_elements : [],
      })) as ATCDrill[];
    },
  });
}

export function useATCDrill(drillId: string | undefined) {
  return useQuery({
    enabled: !!drillId,
    queryKey: ["atc", "drill", drillId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_drills")
        .select("*")
        .eq("id", drillId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        key_elements: Array.isArray((data as any).key_elements) ? (data as any).key_elements : [],
      } as ATCDrill;
    },
  });
}

export function useATCMastery() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ["atc", "mastery", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_mastery")
        .select("category_id, mastery_score, drills_attempted, drills_passed")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as ATCMastery[];
    },
  });
}

export function useATCRecentAttempts(drillId: string | undefined, limit = 3) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id && !!drillId,
    queryKey: ["atc", "attempts", user?.id, drillId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atc_drill_attempts")
        .select("id, drill_id, score, student_response, elements_hit, elements_missed, feedback, correct_version, created_at")
        .eq("user_id", user!.id)
        .eq("drill_id", drillId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ATCAttempt[];
    },
  });
}

/** Heuristic: only treat the pilot as IFR-eligible if certificate string mentions Instrument or "IR". */
export function isIFREligible(certificateType: string | null | undefined): boolean {
  if (!certificateType) return false;
  const t = certificateType.toLowerCase();
  return t.includes("instrument") || /\bir\b/.test(t) || t.includes("atp") || t.includes("commercial");
}
