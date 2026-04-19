import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  SIM_FLIGHT_STARTED_EVENT,
  SIM_FLIGHT_FINISHED_EVENT,
  type SimFlightStartedDetail,
  type SimFlightFinishedDetail,
} from "@/hooks/useSimBridge";
import { nearestAirport } from "@/lib/nearestAirport";
import type { PmdgDebrief } from "@/components/PmdgDebriefModal";

/**
 * Custom event the auto-logbook fires after a PMDG debrief returns from the
 * edge function. The Flight Deck listens to it and pops the debrief modal.
 */
export const PMDG_DEBRIEF_READY_EVENT = "simpilot:pmdg-debrief-ready";
export const PMDG_DEBRIEF_LOADING_EVENT = "simpilot:pmdg-debrief-loading";
export const PMDG_DEBRIEF_ERROR_EVENT = "simpilot:pmdg-debrief-error";

export interface PmdgDebriefReadyDetail {
  flight_log_id: string;
  debrief: PmdgDebrief;
}
export interface PmdgDebriefErrorDetail {
  flight_log_id: string | null;
  message: string;
}

/**
 * useAutoLogbook
 * --------------------------------------------------------------------------
 * Listens for SimPilot Bridge flight-phase events and creates / updates a
 * draft row in `flight_logs` for the authenticated pilot. When a PMDG
 * airframe was detected and an event timeline was captured, it also kicks
 * off the `pmdg-debrief` edge function and broadcasts the result so the
 * Flight Deck can show the airline-style report in a modal.
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
      if (!userId) return;

      startedAtRef.current = detail.at;

      const sourceLabel =
        detail.source === "msfs2024"
          ? "msfs2024"
          : detail.source === "xplane12"
            ? "xplane12"
            : "sim";

      const flightDate = new Date(detail.at).toISOString().slice(0, 10);
      const departureMatch = nearestAirport(detail.lat, detail.lon);
      const departure = departureMatch?.airport.icao ?? null;

      const { data, error } = await supabase
        .from("flight_logs")
        .insert({
          user_id: userId,
          status: "draft",
          flight_date: flightDate,
          source: sourceLabel,
          total_time: 0,
          departure,
          aircraft_type: detail.aircraft_title ?? null,
          remarks: `Auto-detected sim flight start (${sourceLabel}) at ${new Date(
            detail.at,
          ).toLocaleTimeString()}${departure ? ` from ${departure}` : ""}${
            detail.pmdg_variant ? ` · ${detail.pmdg_variant}` : ""
          }.`,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[auto-logbook] insert failed", error);
        return;
      }

      draftIdRef.current = data.id;
      toast.info("Sim flight detected — draft logbook entry started.", {
        description: departure
          ? `Departure auto-filled as ${departure}. Review when you land.`
          : "Review and finalize it from the Logbook when you land.",
      });
    };

    const onFinished = async (e: Event) => {
      const detail = (e as CustomEvent<SimFlightFinishedDetail>).detail;
      if (!detail) return;

      const id = draftIdRef.current;
      if (!id) return;

      const startedAt = detail.startedAt ?? startedAtRef.current;
      const durationMs = detail.durationMs ?? (startedAt ? detail.at - startedAt : 0);
      const totalHours = Math.max(0, Math.round((durationMs / 3_600_000) * 10) / 10);
      const destinationMatch = nearestAirport(detail.lat, detail.lon);
      const destination = destinationMatch?.airport.icao ?? null;

      const { error } = await supabase
        .from("flight_logs")
        .update({
          total_time: totalHours,
          destination,
          remarks: `Auto-logged sim flight (${detail.source ?? "sim"}). Duration: ${totalHours.toFixed(
            1,
          )} h${destination ? `, landed at ${destination}` : ""}.${
            detail.pmdg_variant ? ` ${detail.pmdg_variant} debrief generated.` : ""
          } Review and confirm before finalizing.`,
        })
        .eq("id", id);

      if (error) {
        console.error("[auto-logbook] update failed", error);
      }

      const flightLogId = id;
      draftIdRef.current = null;
      startedAtRef.current = null;

      toast.success(`Sim flight saved — ${totalHours.toFixed(1)} h drafted.`, {
        description: destination
          ? `Landed at ${destination}. Open Logbook to review and finalize.`
          : "Open Logbook to review and finalize.",
      });

      // ---- PMDG debrief ----------------------------------------------------
      if (detail.pmdg_variant && detail.pmdg_events && detail.pmdg_events.length > 0) {
        window.dispatchEvent(
          new CustomEvent(PMDG_DEBRIEF_LOADING_EVENT, {
            detail: { flight_log_id: flightLogId },
          }),
        );
        try {
          const { data: dbgData, error: dbgErr } = await supabase.functions.invoke(
            "pmdg-debrief",
            {
              body: {
                flight_log_id: flightLogId,
                variant: detail.pmdg_variant,
                aircraft_title: detail.aircraft_title,
                duration_minutes: durationMs / 60_000,
                departure: null,
                destination,
                events: detail.pmdg_events,
              },
            },
          );
          if (dbgErr) throw dbgErr;
          const debrief = (dbgData as { debrief?: PmdgDebrief })?.debrief;
          if (debrief) {
            window.dispatchEvent(
              new CustomEvent<PmdgDebriefReadyDetail>(PMDG_DEBRIEF_READY_EVENT, {
                detail: { flight_log_id: flightLogId, debrief },
              }),
            );
            toast.success("Airline-style PMDG debrief ready.", {
              description: `${detail.pmdg_variant} flight reviewed — open the report from the Flight Deck.`,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to generate debrief";
          console.error("[auto-logbook] pmdg-debrief failed", err);
          window.dispatchEvent(
            new CustomEvent<PmdgDebriefErrorDetail>(PMDG_DEBRIEF_ERROR_EVENT, {
              detail: { flight_log_id: flightLogId, message },
            }),
          );
          toast.error("Could not generate PMDG debrief", { description: message });
        }
      }
    };

    window.addEventListener(SIM_FLIGHT_STARTED_EVENT, onStarted as EventListener);
    window.addEventListener(SIM_FLIGHT_FINISHED_EVENT, onFinished as EventListener);
    return () => {
      window.removeEventListener(SIM_FLIGHT_STARTED_EVENT, onStarted as EventListener);
      window.removeEventListener(SIM_FLIGHT_FINISHED_EVENT, onFinished as EventListener);
    };
  }, []);
}

