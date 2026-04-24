import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const key = Deno.env.get("FLIGHTAWARE_API_KEY") || "";
  const masked = key ? `${key.slice(0, 4)}…${key.slice(-4)} (len=${key.length})` : "MISSING";
  const out: Record<string, unknown> = { key: masked };

  const probes: [string, string][] = [
    ["aircraft_flights_N12345", "https://aeroapi.flightaware.com/aeroapi/aircraft/N12345/flights"],
    ["airports_KJFK", "https://aeroapi.flightaware.com/aeroapi/airports/KJFK"],
    ["search_positions_bbox", "https://aeroapi.flightaware.com/aeroapi/flights/search/positions?query=" +
      encodeURIComponent('-latlong "30 -120 40 -110"') + "&max_pages=1"],
    ["me", "https://aeroapi.flightaware.com/aeroapi/me"],
  ];

  for (const [name, url] of probes) {
    try {
      const r = await fetch(url, { headers: { "x-apikey": key, Accept: "application/json" } });
      const body = (await r.text()).slice(0, 400);
      out[name] = { status: r.status, body };
    } catch (e) {
      out[name] = { error: String(e) };
    }
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
