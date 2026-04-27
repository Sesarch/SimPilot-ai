import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TrialActivity {
  groundSchoolModules: number;
  atcSessions: number;
  examAttempts: number;
  flightLogs: number;
}

export interface TrialStatus {
  loading: boolean;
  trialEndsAt: Date | null;
  trialStartedAt: Date | null;
  daysRemaining: number;
  trialExpired: boolean;
  subscribed: boolean;
  subscriptionTier: "pro" | "ultra" | null;
  activity: TrialActivity;
  refresh: () => Promise<void>;
}

const ZERO_ACTIVITY: TrialActivity = {
  groundSchoolModules: 0,
  atcSessions: 0,
  examAttempts: 0,
  flightLogs: 0,
};

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [trialStartedAt, setTrialStartedAt] = useState<Date | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"pro" | "ultra" | null>(null);
  const [activity, setActivity] = useState<TrialActivity>(ZERO_ACTIVITY);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Trial dates from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_started_at, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.trial_ends_at) setTrialEndsAt(new Date(profile.trial_ends_at));
    if (profile?.trial_started_at) setTrialStartedAt(new Date(profile.trial_started_at));

    // 2. Subscription status (Stripe)
    try {
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData?.subscribed) {
        setSubscribed(true);
        setSubscriptionTier(subData.tier ?? null);
      } else {
        setSubscribed(false);
        setSubscriptionTier(null);
      }
    } catch {
      setSubscribed(false);
    }

    // 3. Activity counts (parallel)
    const [gs, atc, exams, logs] = await Promise.all([
      supabase
        .from("topic_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true),
      supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("mode", "atc"),
      supabase
        .from("exam_scores")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("flight_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    setActivity({
      groundSchoolModules: gs.count ?? 0,
      atcSessions: atc.count ?? 0,
      examAttempts: exams.count ?? 0,
      flightLogs: logs.count ?? 0,
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const now = Date.now();
  const trialEndMs = trialEndsAt?.getTime() ?? 0;
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialExpired = !!trialEndsAt && trialEndMs <= now;

  return {
    loading,
    trialEndsAt,
    trialStartedAt,
    daysRemaining,
    trialExpired,
    subscribed,
    subscriptionTier,
    activity,
    refresh: fetchAll,
  };
}
