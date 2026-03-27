import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "simpilot_anon_msgs";
const ANON_LIMIT = 5;
const FREE_DAILY_LIMIT = 20;

type GateStatus = "allowed" | "signup_required" | "paywall";

function getAnonCount(): number {
  try {
    return parseInt(localStorage.getItem(ANON_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function incrementAnonCount(): number {
  const next = getAnonCount() + 1;
  try {
    localStorage.setItem(ANON_KEY, String(next));
  } catch { /* private browsing */ }
  return next;
}

export function useMessageLimit() {
  const { user } = useAuth();
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [gateStatus, setGateStatus] = useState<GateStatus>("allowed");
  const [showGate, setShowGate] = useState(false);

  // Fetch daily count for signed-in users
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);

    supabase
      .from("message_usage")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle()
      .then(({ data }) => {
        setDailyCount(data?.message_count ?? 0);
      });
  }, [user]);

  const checkLimit = useCallback((): boolean => {
    // Anonymous user
    if (!user) {
      const count = getAnonCount();
      if (count >= ANON_LIMIT) {
        setGateStatus("signup_required");
        setShowGate(true);
        return false;
      }
      return true;
    }

    // Signed-in free user (TODO: check subscription status later)
    if (dailyCount >= FREE_DAILY_LIMIT) {
      setGateStatus("paywall");
      setShowGate(true);
      return false;
    }

    return true;
  }, [user, dailyCount]);

  const recordUsage = useCallback(async () => {
    if (!user) {
      incrementAnonCount();
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("message_usage")
      .select("id, message_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("message_usage")
        .update({ message_count: existing.message_count + 1 })
        .eq("id", existing.id);
      setDailyCount(existing.message_count + 1);
    } else {
      await supabase
        .from("message_usage")
        .insert({ user_id: user.id, usage_date: today, message_count: 1 });
      setDailyCount(1);
    }
  }, [user]);

  const dismissGate = useCallback(() => setShowGate(false), []);

  const remaining = user
    ? Math.max(0, FREE_DAILY_LIMIT - dailyCount)
    : Math.max(0, ANON_LIMIT - getAnonCount());

  return {
    checkLimit,
    recordUsage,
    gateStatus,
    showGate,
    dismissGate,
    remaining,
    isAnonymous: !user,
  };
}
