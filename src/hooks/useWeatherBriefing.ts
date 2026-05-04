import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PreflightBriefing = {
  departure: string;
  practiceArea: string | null;
  coords: { lat: number; lon: number } | null;
  radius_nm: number;
  bbox: string | null;
  metar?: string;
  taf?: string;
  sigmets: string[];
  airmets: string[];
  pireps: string[];
  fetched_at: string;
};

export function useWeatherBriefing() {
  const [data, setData] = useState<PreflightBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch a localized pre-flight briefing for a single departure airport
   * plus a 25 NM radius (for SIGMETs / AIRMETs / PIREPs in the practice area).
   */
  const fetchBriefing = async (departure: string, practiceArea?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "weather-briefing",
        { body: { departure, practiceArea } },
      );
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result as PreflightBriefing);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch weather");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchBriefing };
}
