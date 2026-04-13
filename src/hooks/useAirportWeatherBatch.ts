import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { majorAirports } from "@/data/majorAirports";

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR" | null;

function classifyMetar(raw: string): FlightCategory {
  // Visibility
  const visMatch = raw.match(/\b(\d+\/?\d*)\s*SM\b/);
  let vis = 10;
  if (visMatch) {
    const parts = visMatch[1].split("/");
    vis = parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : parseInt(parts[0]);
  }

  // Ceiling (BKN or OVC)
  const ceilMatches = [...raw.matchAll(/\b(BKN|OVC)(\d{3})\b/g)];
  let ceil = 99999;
  for (const m of ceilMatches) {
    const alt = parseInt(m[2]) * 100;
    if (alt < ceil) ceil = alt;
  }

  if (vis < 1 || ceil < 500) return "LIFR";
  if (vis < 3 || ceil < 1000) return "IFR";
  if (vis <= 5 || ceil <= 3000) return "MVFR";
  return "VFR";
}

export const useAirportWeatherBatch = () => {
  const [categories, setCategories] = useState<Record<string, FlightCategory>>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const icaos = majorAirports.map(a => a.icao);
        // Batch in groups of 20 (API limit)
        const batches: string[][] = [];
        for (let i = 0; i < icaos.length; i += 20) {
          batches.push(icaos.slice(i, i + 20));
        }

        const results: Record<string, FlightCategory> = {};

        await Promise.all(batches.map(async (batch) => {
          try {
            const { data, error } = await supabase.functions.invoke("weather-briefing", {
              body: { stations: batch, type: "metar" },
            });
            if (error) return;
            for (const [icao, val] of Object.entries(data || {})) {
              const metar = (val as any)?.metar;
              if (metar) {
                results[icao] = classifyMetar(metar);
              }
            }
          } catch {
            // skip failed batch
          }
        }));

        setCategories(results);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { categories, loading };
};
