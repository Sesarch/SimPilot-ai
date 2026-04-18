import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  SIM_FLIGHT_STARTED_EVENT,
  SIM_FLIGHT_FINISHED_EVENT,
  type SimFlightStartedDetail,
  type SimFlightFinishedDetail,
} from "@/hooks/useSimBridge";

/**
 * useAutoLogbook
 * --------------------------------------------------------------------------
 * Listens for SimPilot Bridge flight-phase events and creates / updates a
 * draft row in `flight_logs` for the authenticated pilot.
 *
 *   simpilot:flight-started  → INSERT a draft row, capture the new id
 *   simpilot:flight-finished → UPDATE that row with total_time + a remark
 *
 * The row stays in `status='draft'` so the pilot must review it on the
 * Logbook page before it counts as a real entry. RLS guarantees only the
 * logged-in pilot can write or read their own logs.
 */
export function useAutoLogbook() {
  const draftIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const onStarted = async (e: Event) => {
      const detail = (e as CustomEvent<SimFlightStartedDetail>).detail;
      if (!detail) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return; // not signed in — nothing to log

      startedAtRef.current = detail.at;

      const sourceLabel =
        detail.source === "msfs2024"
          ? "msfs2024"
          : detail.source === "xplane12"
            ? "xplane12"
            : "sim";

      const flightDate = new Date(detail.at).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("flight_logs")
        .insert({
          user_id: userId,
          status: "draft",
          flight_date: flightDate,
          source: sourceLabel,
          total_time: 0,
          remarks: `Auto-detected sim flight start (${sourceLabel}) at ${new Date(
            detail.at,
          ).toLocaleTimeString()}.`,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[auto-logbook] insert failed", error);
        return;
      }

      draftIdRef.current = data.id;
      toast.info("Sim flight detected — draft logbook entry started.", {
        description: "Review and finalize it from the Logbook when you land.",
      });
    };

    const onFinished = async (e: Event) => {
      const detail = (e as CustomEvent<SimFlightFinishedDetail>).detail;
      if (!detail) return;

      const id = draftIdRef.current;
      if (!id) return; // no draft to close (e.g. page mounted mid-flight)

      const startedAt = detail.startedAt ?? startedAtRef.current;
      const durationMs =
        detail.durationMs ?? (startedAt ? detail.at - startedAt : 0);
      const totalHours = Math.max(0, Math.round((durationMs / 3_600_000) * 10) / 10);

      const { error } = await supabase
        .from("flight_logs")
        .update({
          total_time: totalHours,
          remarks: `Auto-logged sim flight (${detail.source ?? "sim"}). Duration: ${totalHours.toFixed(1)} h. Review and confirm before finalizing.`,
        })
        .eq("id", id);

      if (error) {
        console.error("[auto-logbook] update failed", error);
        return;
      }

      draftIdRef.current = null;
      startedAtRef.current = null;
      toast.success(`Sim flight saved — ${totalHours.toFixed(1)} h drafted.`, {
        description: "Open Logbook to review and finalize.",
      });
    };

    window.addEventListener(SIM_FLIGHT_STARTED_EVENT, onStarted as EventListener);
    window.addEventListener(SIM_FLIGHT_FINISHED_EVENT, onFinished as EventListener);
    return () => {
      window.removeEventListener(SIM_FLIGHT_STARTED_EVENT, onStarted as EventListener);
      window.removeEventListener(SIM_FLIGHT_FINISHED_EVENT, onFinished as EventListener);
    };
  }, []);
}
