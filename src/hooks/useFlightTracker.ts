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

export type DataSource = "live" | "demo" | null;

// Realistic mock flight data covering major US routes
function generateMockAircraft(): Aircraft[] {
  const routes = [
    { icao: "a1b2c3", call: "UAL1234", country: "United States", lon: -87.65, lat: 41.88, alt: 10668, vel: 230, hdg: 90, vr: 0, gnd: false, sqk: "1200" },
    { icao: "a2c4e6", call: "DAL456", country: "United States", lon: -73.78, lat: 40.64, alt: 0, vel: 0, hdg: 220, vr: 0, gnd: true, sqk: "1200" },
    { icao: "a3d5f7", call: "AAL789", country: "United States", lon: -118.41, lat: 33.94, alt: 11887, vel: 245, hdg: 45, vr: 2.5, gnd: false, sqk: "4523" },
    { icao: "a4e6g8", call: "SWA321", country: "United States", lon: -97.04, lat: 32.90, alt: 7620, vel: 195, hdg: 180, vr: -5.0, gnd: false, sqk: "3412" },
    { icao: "a5f7h9", call: "JBU555", country: "United States", lon: -71.01, lat: 42.37, alt: 9144, vel: 210, hdg: 270, vr: 0, gnd: false, sqk: "5674" },
    { icao: "a6g8i0", call: "SKW4412", country: "United States", lon: -122.38, lat: 37.62, alt: 3048, vel: 140, hdg: 310, vr: 8.0, gnd: false, sqk: "2345" },
    { icao: "a7h9j1", call: "FDX1001", country: "United States", lon: -85.74, lat: 38.17, alt: 12192, vel: 260, hdg: 60, vr: 0, gnd: false, sqk: "6712" },
    { icao: "a8i0k2", call: "UAL987", country: "United States", lon: -104.67, lat: 39.86, alt: 5486, vel: 170, hdg: 135, vr: -7.5, gnd: false, sqk: "1234" },
    { icao: "a9j1l3", call: "AAL222", country: "United States", lon: -80.29, lat: 25.80, alt: 10363, vel: 225, hdg: 350, vr: 1.2, gnd: false, sqk: "7654" },
    { icao: "b0k2m4", call: "DAL100", country: "United States", lon: -84.43, lat: 33.64, alt: 0, vel: 12, hdg: 90, vr: 0, gnd: true, sqk: "1200" },
    { icao: "b1l3n5", call: "SWA800", country: "United States", lon: -95.34, lat: 29.99, alt: 8534, vel: 205, hdg: 200, vr: -3.0, gnd: false, sqk: "3321" },
    { icao: "b2m4o6", call: "JBU102", country: "United States", lon: -77.04, lat: 38.85, alt: 6096, vel: 180, hdg: 30, vr: 5.5, gnd: false, sqk: "4456" },
    { icao: "b3n5p7", call: "ENY3456", country: "United States", lon: -112.01, lat: 33.43, alt: 4572, vel: 155, hdg: 260, vr: -9.0, gnd: false, sqk: "2200" },
    { icao: "b4o6q8", call: "ASA600", country: "United States", lon: -122.31, lat: 47.45, alt: 11278, vel: 240, hdg: 160, vr: 0, gnd: false, sqk: "5500" },
    { icao: "b5p7r9", call: "UAL333", country: "United States", lon: -93.22, lat: 44.88, alt: 9753, vel: 215, hdg: 110, vr: 0.8, gnd: false, sqk: "6600" },
    { icao: "b6q8s0", call: "DAL750", country: "United States", lon: -86.75, lat: 36.12, alt: 7010, vel: 190, hdg: 320, vr: -2.0, gnd: false, sqk: "7700" },
    { icao: "b7r9t1", call: "N172SP", country: "United States", lon: -81.68, lat: 28.43, alt: 914, vel: 55, hdg: 180, vr: 0, gnd: false, sqk: "1200" },
    { icao: "b8s0u2", call: "N456GA", country: "United States", lon: -117.19, lat: 32.73, alt: 1524, vel: 65, hdg: 270, vr: 2.0, gnd: false, sqk: "1200" },
    { icao: "b9t1v3", call: "CPA888", country: "Hong Kong", lon: -120.50, lat: 38.00, alt: 12497, vel: 265, hdg: 80, vr: 0, gnd: false, sqk: "4321" },
    { icao: "c0u2w4", call: "BAW117", country: "United Kingdom", lon: -74.50, lat: 40.00, alt: 11582, vel: 255, hdg: 250, vr: -0.5, gnd: false, sqk: "5432" },
  ];

  return routes.map((r) => ({
    icao24: r.icao,
    callsign: r.call,
    originCountry: r.country,
    longitude: r.lon + (Math.random() - 0.5) * 0.5,
    latitude: r.lat + (Math.random() - 0.5) * 0.5,
    altitude: r.alt,
    velocity: r.vel,
    heading: r.hdg,
    verticalRate: r.vr,
    onGround: r.gnd,
    squawk: r.sqk,
  }));
}

export const useFlightTracker = (bounds?: { north: number; south: number; east: number; west: number }) => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>(null);

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
      const timeoutId = setTimeout(() => controller.abort(), 12000);
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
      setDataSource(data._source === "demo" ? "demo" : "live");
      if (!data.states) {
        setAircraft([]);
        setLastUpdated(new Date());
        return;
      }
      const mapped: Aircraft[] = data.states
        .filter((s: any[]) => s[5] != null && s[6] != null)
        .slice(0, 300)
        .map((s: any[]) => ({
          icao24: String(s[0] || ""),
          callsign: String(s[1] || "").trim(),
          originCountry: String(s[2] || ""),
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
    } catch (_err: any) {
      // On any failure, fall back to mock data instead of showing an error
      console.log("Flight data fetch failed, using demo data");
      setAircraft(generateMockAircraft());
      setDataSource("demo");
      setLastUpdated(new Date());
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [bounds?.north, bounds?.south, bounds?.east, bounds?.west]);

  useEffect(() => {
    fetchAircraft();
    const interval = setInterval(fetchAircraft, 15000);
    return () => clearInterval(interval);
  }, [fetchAircraft]);

  return { aircraft, loading, error, lastUpdated, refresh: fetchAircraft, dataSource };
};
