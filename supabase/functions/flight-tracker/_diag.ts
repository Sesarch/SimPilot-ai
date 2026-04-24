// Temporary diagnostic — remove after debugging
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("FLIGHTAWARE_API_KEY") || "";
  const masked = key ? `${key.slice(0, 4)}…${key.slice(-4)} (len=${key.length})` : "MISSING";

  const tests: Record<string, unknown> = { key: masked };

  // 1. Simple endpoint that exists on every AeroAPI tier
  const r1 = await fetch("https://aeroapi.flightaware.com/aeroapi/aircraft/N12345/flights", {
    headers: { "x-apikey": key, Accept: "application/json" },
  });
  tests.aircraft_flights = { status: r1.status, body: (await r1.text()).slice(0, 300) };

  // 2. The endpoint we're actually using
  const r2 = await fetch(
    "https://aeroapi.flightaware.com/aeroapi/flights/search/positions?query=" +
      encodeURIComponent('-latlong "30 -120 40 -110"') +
      "&max_pages=1",
    { headers: { "x-apikey": key, Accept: "application/json" } },
  );
  tests.search_positions = { status: r2.status, body: (await r2.text()).slice(0, 300) };

  return new Response(JSON.stringify(tests, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
