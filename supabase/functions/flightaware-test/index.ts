import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("FLIGHTAWARE_API_KEY") || "";
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "FLIGHTAWARE_API_KEY is not configured.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const masked = `${apiKey.slice(0, 4)}…${apiKey.slice(-4)} (len=${apiKey.length})`;

  // Probe 1: a sanity-check endpoint that exists on every AeroAPI tier.
  // If this fails with 401/403 → the key itself is bad.
  const sanity = await runProbe(`${FA_BASE}/airports/KJFK`, apiKey);

  // Probe 2: the actual endpoint Live Sky needs for the bbox map.
  // Requires Standard tier or higher.
  const bboxQuery = `-latlong "30 -120 40 -110"`;
  const positions = await runProbe(
    `${FA_BASE}/flights/search/positions?query=${encodeURIComponent(bboxQuery)}&max_pages=1`,
    apiKey,
  );

  // Diagnose
  const keyValid = sanity.status === 200;
  const positionsOk = positions.status === 200;
  let verdict: string;
  let recommendation: string;

  if (!keyValid) {
    verdict = "Key rejected by FlightAware.";
    recommendation =
      "Generate a new key in the FlightAware AeroAPI portal and update the FLIGHTAWARE_API_KEY secret.";
  } else if (positionsOk) {
    verdict = "Live position search is working — Live Sky will use FlightAware.";
    recommendation = "No action needed.";
  } else if (positions.status === 400 && positions.body.includes("Undisclosed")) {
    verdict =
      "Key is valid, but your AeroAPI plan does not include /flights/search/positions.";
    recommendation =
      "Upgrade your AeroAPI subscription to Standard tier in the FlightAware portal. The same key will start working immediately afterwards.";
  } else if (positions.status === 401 || positions.status === 403) {
    verdict = "Key is valid for some endpoints but not authorized for live position search.";
    recommendation = "Check your AeroAPI plan permissions in the FlightAware portal.";
  } else {
    verdict = `Unexpected response from /flights/search/positions (${positions.status}).`;
    recommendation = "See raw response below for details.";
  }

  return new Response(
    JSON.stringify({
      ok: positionsOk,
      key: masked,
      verdict,
      recommendation,
      probes: {
        sanity_check: {
          endpoint: "GET /airports/KJFK",
          status: sanity.status,
          ok: sanity.status === 200,
          body_preview: sanity.body.slice(0, 200),
        },
        live_positions: {
          endpoint: "GET /flights/search/positions",
          query: bboxQuery,
          status: positions.status,
          ok: positions.status === 200,
          body_preview: positions.body.slice(0, 400),
        },
      },
    }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function runProbe(url: string, apiKey: string): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { "x-apikey": apiKey, Accept: "application/json" },
    });
    const body = await res.text();
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: err instanceof Error ? err.message : String(err) };
  }
}
