import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 5;
const MAX_LIMIT = 50;

/**
 * Read & update the signed-in user's per-topic quiz history limit.
 * The DB trigger auto-archives anything older than this limit on the next save.
 */
export function useQuizHistoryLimit(userId: string | undefined) {
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("quiz_history_limit")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data && typeof (data as { quiz_history_limit?: number }).quiz_history_limit === "number") {
          setLimit((data as { quiz_history_limit: number }).quiz_history_limit);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = useCallback(
    async (next: number) => {
      if (!userId) return false;
      const clamped = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.round(next)));
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({ quiz_history_limit: clamped })
        .eq("user_id", userId);
      setSaving(false);
      if (error) {
        console.error("Failed to save history limit:", error);
        return false;
      }
      setLimit(clamped);
      return true;
    },
    [userId],
  );

  return { limit, loading, saving, save, MIN_LIMIT, MAX_LIMIT, DEFAULT_LIMIT };
}
