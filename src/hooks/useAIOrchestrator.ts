// React hook to call the multi-brain AI Orchestrator and watch for safety flags.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrchestratorTask = "auto" | "technical" | "operational" | "vision";

export interface OrchestratorMessage {
  role: "user" | "assistant" | "system";
  content: any;
}

export interface OrchestratorResult {
  task: string;
  model: string;
  latency_ms: number;
  response: string;
  audit_id: string | null;
  safety_notice_template: string;
}

export interface SafetyFlag {
  id: string;
  audit_queue_id: string;
  severity: number;
  category: string;
  contradiction: string;
  poh_reference: string | null;
  auditor_model: string;
  created_at: string;
}

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`;

export function useAIOrchestrator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<OrchestratorResult | null>(null);

  const ask = useCallback(
    async (params: {
      messages: OrchestratorMessage[];
      task?: OrchestratorTask;
      hint?: string;
      session_id?: string;
      message_id?: string;
      has_image?: boolean;
    }): Promise<OrchestratorResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const r = await fetch(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(params),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
        setLastResult(j);
        return j as OrchestratorResult;
      } catch (e: any) {
        setError(e?.message || "Orchestrator error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { ask, loading, error, lastResult };
}

/** Watches `ai_safety_flags` for the signed-in user in real time. */
export function useUserSafetyFlags() {
  const [flags, setFlags] = useState<SafetyFlag[]>([]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data } = await supabase
        .from("ai_safety_flags")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (mounted && data) setFlags(data as any);

      channel = supabase
        .channel(`safety-flags-${u.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "ai_safety_flags", filter: `user_id=eq.${u.user.id}` },
          (payload) => setFlags((prev) => [payload.new as any, ...prev]),
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return flags;
}
