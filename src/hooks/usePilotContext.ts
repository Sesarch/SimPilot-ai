import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PilotContext {
  certificate_type: string | null;
  aircraft_type: string | null;
  rating_focus: string | null;
  region: string | null;
  flight_hours: string | null;
}

const LOCAL_KEY = "simpilot_pilot_context";

function loadLocal(): PilotContext {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : { certificate_type: null, aircraft_type: null, rating_focus: null, region: null };
  } catch {
    return { certificate_type: null, aircraft_type: null, rating_focus: null, region: null };
  }
}

function saveLocal(ctx: PilotContext) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ctx));
}

export function usePilotContext() {
  const { user } = useAuth();
  const [context, setContext] = useState<PilotContext>(loadLocal);
  const [loaded, setLoaded] = useState(false);

  // Load from profile if logged in
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          const profileCtx: PilotContext = {
            certificate_type: d.certificate_type ?? null,
            aircraft_type: d.aircraft_type ?? null,
            rating_focus: d.rating_focus ?? null,
            region: d.region ?? null,
          };
          // Only update if profile has data
          if (Object.values(profileCtx).some(v => v)) {
            setContext(profileCtx);
            saveLocal(profileCtx);
          }
        }
        setLoaded(true);
      });
  }, [user]);

  const updateField = useCallback(
    (field: keyof PilotContext, value: string | null) => {
      setContext((prev) => {
        const next = { ...prev, [field]: value };
        saveLocal(next);

        // Save to profile if logged in
        if (user) {
          supabase
            .from("profiles")
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to save pilot context:", error);
            });
        }

        return next;
      });
    },
    [user]
  );

  const isComplete = Object.values(context).every((v) => v !== null);

  /** Build a concise string for the system prompt */
  const toPromptString = useCallback(() => {
    const parts: string[] = [];
    if (context.certificate_type) parts.push(`Certificate: ${context.certificate_type}`);
    if (context.aircraft_type) parts.push(`Aircraft: ${context.aircraft_type}`);
    if (context.rating_focus) parts.push(`Rating/Focus: ${context.rating_focus}`);
    if (context.region) parts.push(`Region: ${context.region}`);
    return parts.length ? parts.join(" | ") : "";
  }, [context]);

  return { context, updateField, isComplete, loaded, toPromptString };
}
