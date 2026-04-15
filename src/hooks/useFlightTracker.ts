import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Aircraft {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  altitude: number; // meters
  velocity: number; // m/s
  heading: number;
  verticalRate: number;
  onGround: boolean;
  squawk: string | null;
}

export const useFlightTracker = (bounds?: { north: number; south: number; east: number; west: number }) => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAircraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (bounds) {
        params.set("lamin", bounds.south.toString());
        params.set("lamax", bounds.north.toString());
        params.set("lomin", bounds.west.toString());
        params.set("lomax", bounds.east.toString());
      }
      const queryString = params.toString() ? `?${params}` : "";
      const { data: { session } } = await supabase.auth.getSession();
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${supabaseUrl}/functions/v1/flight-tracker${queryString}`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token || anonKey}`,
          "apikey": anonKey,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Rate limited — please wait a moment before refreshing.");
        }
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      if (!data.states) {
        setAircraft([]);
        setLastUpdated(new Date());
        return;
      }
      const mapped: Aircraft[] = data.states
        .filter((s: any[]) => s[5] != null && s[6] != null)
        .slice(0, 300) // limit for perf
        .map((s: any[]) => ({
          icao24: s[0] || "",
          callsign: (s[1] || "").trim(),
          originCountry: s[2] || "",
          longitude: s[5],
          latitude: s[6],
          altitude: s[7] || 0,
          velocity: s[9] || 0,
          heading: s[10] || 0,
          verticalRate: s[11] || 0,
          onGround: s[8] || false,
          squawk: s[14] || null,
        }));
      setAircraft(mapped);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Request timed out — the flight data source may be slow. Try again.");
      } else {
        setError(err.message || "Failed to fetch flight data.");
      }
    } finally {
      setLoading(false);
    }
  }, [bounds?.north, bounds?.south, bounds?.east, bounds?.west]);

  useEffect(() => {
    fetchAircraft();
    const interval = setInterval(fetchAircraft, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAircraft]);

  return { aircraft, loading, error, lastUpdated, refresh: fetchAircraft };
};
