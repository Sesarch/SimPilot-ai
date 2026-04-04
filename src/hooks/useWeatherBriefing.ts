import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WeatherData = {
  stations: Record<string, { metar?: string; taf?: string }>;
  fetched_at: string;
};

export function useWeatherBriefing() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (stations: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "weather-briefing",
        { body: { stations, type: "full" } }
      );
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result as WeatherData);
    } catch (e: any) {
      setError(e.message || "Failed to fetch weather");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchWeather };
}
