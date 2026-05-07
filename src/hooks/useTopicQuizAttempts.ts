import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuizAttemptQuestion {
  question: string;
  options: string[];
  correct: number;
  user_answer: number;
  acs_code?: string;
  explanation?: string;
}

export interface QuizAttempt {
  id: string;
  topic_id: string;
  certificate_level: string | null;
  score: number;
  total: number;
  passed: boolean;
  questions: QuizAttemptQuestion[];
  created_at: string;
}

/** Fetch the recent quiz attempt history for a single topic for the signed-in user. */
export function useTopicQuizHistory(topicId: string | undefined, userId: string | undefined, refreshKey = 0) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!topicId || !userId) {
      setAttempts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("topic_quiz_attempts")
      .select("id, topic_id, certificate_level, score, total, passed, questions, created_at")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load quiz attempts:", error);
          setAttempts([]);
        } else {
          setAttempts((data ?? []) as unknown as QuizAttempt[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId, userId, refreshKey]);

  return { attempts, loading };
}

/** Save a new quiz attempt; returns true on success. */
export function useSaveQuizAttempt() {
  return useCallback(
    async (input: {
      userId: string;
      topicId: string;
      certificateLevel?: string | null;
      score: number;
      total: number;
      passed: boolean;
      questions: QuizAttemptQuestion[];
      sessionId?: string | null;
    }) => {
      const { error } = await supabase.from("topic_quiz_attempts").insert({
        user_id: input.userId,
        topic_id: input.topicId,
        certificate_level: input.certificateLevel ?? null,
        score: input.score,
        total: input.total,
        passed: input.passed,
        questions: input.questions as any,
        session_id: input.sessionId ?? null,
      });
      if (error) {
        console.error("Failed to save quiz attempt:", error);
        return false;
      }
      return true;
    },
    [],
  );
}
