import { corsHeaders } from "https://cdn.jsdelivr.net/gh/supabase/supabase-js@2/src/lib/fetch/index.ts";

const AWC_BASE = "https://aviationweather.gov/api/data";

const corsHeadersObj = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersObj });
  }

  try {
    const { stations, type } = await req.json();

    if (!stations || !Array.isArray(stations) || stations.length === 0) {
      return new Response(
        JSON.stringify({ error: "stations array required" }),
        { status: 400, headers: { ...corsHeadersObj, "Content-Type": "application/json" } }
      );
    }

    // Validate station identifiers (4 chars alphanumeric)
    const validStations = stations
      .map((s: string) => s.trim().toUpperCase())
      .filter((s: string) => /^[A-Z0-9]{3,4}$/.test(s))
      .slice(0, 20); // max 20 stations

    if (validStations.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid station identifiers provided" }),
        { status: 400, headers: { ...corsHeadersObj, "Content-Type": "application/json" } }
      );
    }

    const ids = validStations.join(",");
    const results: Record<string, { metar?: string; taf?: string }> = {};

    // Fetch METARs
    const metarUrl = `${AWC_BASE}/metar?ids=${ids}&format=raw&taf=false&hours=2`;
    const metarRes = await fetch(metarUrl);
    if (metarRes.ok) {
      const metarText = await metarRes.text();
      const lines = metarText.trim().split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        // METAR starts with station ID (possibly prefixed with METAR or SPECI)
        const cleaned = line.replace(/^(METAR|SPECI)\s+/, "");
        const stationMatch = cleaned.match(/^([A-Z][A-Z0-9]{2,3})\s/);
        if (stationMatch) {
          const id = stationMatch[1];
          if (!results[id]) results[id] = {};
          // Keep only the most recent METAR per station
          if (!results[id].metar) {
            results[id].metar = cleaned.trim();
          }
        }
      }
    }

    // Fetch TAFs if requested
    if (type !== "metar_only") {
      const tafUrl = `${AWC_BASE}/taf?ids=${ids}&format=raw&metar=false`;
      const tafRes = await fetch(tafUrl);
      if (tafRes.ok) {
        const tafText = await tafRes.text();
        // TAFs can span multiple lines; rejoin them
        const tafBlocks = tafText.trim().split(/\n(?=TAF\s|[A-Z]{4}\s)/);
        for (const block of tafBlocks) {
          const cleaned = block.replace(/^TAF\s+(AMD\s+|COR\s+)?/, "").trim();
          const stationMatch = cleaned.match(/^([A-Z][A-Z0-9]{2,3})\s/);
          if (stationMatch) {
            const id = stationMatch[1];
            if (!results[id]) results[id] = {};
            results[id].taf = block.trim();
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ stations: results, fetched_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeadersObj, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weather briefing error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch weather data" }),
      { status: 500, headers: { ...corsHeadersObj, "Content-Type": "application/json" } }
    );
  }
});
