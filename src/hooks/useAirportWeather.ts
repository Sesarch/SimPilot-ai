import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MetarData {
  raw: string;
  wind?: string;
  visibility?: string;
  ceiling?: string;
  temperature?: string;
  dewpoint?: string;
  altimeter?: string;
  flightCategory?: "VFR" | "MVFR" | "IFR" | "LIFR";
}

function parseMetar(raw: string): MetarData {
  const data: MetarData = { raw };

  // Wind: e.g. 27015G25KT or VRB03KT
  const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT\b/);
  if (windMatch) {
    const dir = windMatch[1] === "VRB" ? "Variable" : `${windMatch[1]}°`;
    const spd = parseInt(windMatch[2]);
    const gust = windMatch[4] ? `G${windMatch[4]}` : "";
    data.wind = `${dir} ${spd}${gust} kt`;
  }

  // Visibility: e.g. 10SM or 3SM or 1/2SM
  const visMatch = raw.match(/\b(\d+\/?\d*)\s*SM\b/);
  if (visMatch) {
    data.visibility = `${visMatch[1]} SM`;
  }

  // Ceiling: look for BKN or OVC
  const ceilingMatch = raw.match(/\b(BKN|OVC)(\d{3})\b/);
  if (ceilingMatch) {
    const alt = parseInt(ceilingMatch[2]) * 100;
    data.ceiling = `${ceilingMatch[1]} ${alt.toLocaleString()} ft`;
  }

  // Temperature/Dewpoint: e.g. 22/15 or M02/M05
  const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  if (tempMatch) {
    const parseTemp = (s: string) => (s.startsWith("M") ? `-${s.slice(1)}` : s);
    data.temperature = `${parseTemp(tempMatch[1])}°C`;
    data.dewpoint = `${parseTemp(tempMatch[2])}°C`;
  }

  // Altimeter: e.g. A3015 or Q1013
  const altMatch = raw.match(/\b[AQ](\d{4})\b/);
  if (altMatch) {
    const val = parseInt(altMatch[1]);
    data.altimeter = raw.includes("A") ? `${(val / 100).toFixed(2)} inHg` : `${val} hPa`;
  }

  // Flight category estimation
  const visNum = visMatch ? eval(visMatch[1]) : 10;
  const ceilAlt = ceilingMatch ? parseInt(ceilingMatch[2]) * 100 : 99999;
  if (visNum < 1 || ceilAlt < 500) data.flightCategory = "LIFR";
  else if (visNum < 3 || ceilAlt < 1000) data.flightCategory = "IFR";
  else if (visNum <= 5 || ceilAlt <= 3000) data.flightCategory = "MVFR";
  else data.flightCategory = "VFR";

  return data;
}

export const useAirportWeather = (icao: string | null) => {
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!icao) {
      setMetar(null);
      return;
    }

    let cancelled = false;
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("weather-briefing", {
          body: { stations: [icao], type: "metar" },
        });
        if (fnError) throw fnError;
        const stationData = data?.[icao];
        if (stationData?.metar && !cancelled) {
          setMetar(parseMetar(stationData.metar));
        } else if (!cancelled) {
          setMetar(null);
          setError("No METAR available");
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to fetch weather");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();
    return () => { cancelled = true; };
  }, [icao]);

  return { metar, loading, error };
};
