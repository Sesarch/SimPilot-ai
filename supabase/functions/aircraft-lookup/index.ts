import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";
const PLANESPOTTERS_BASE = "https://api.planespotters.net/pub/photos";

function clean(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

async function faGet(path: string, apiKey: string): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`${FA_BASE}${path}`, {
      headers: { "x-apikey": apiKey, Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      console.warn("FA non-OK", path, r.status);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn("FA error", path, (e as Error).message);
    return null;
  }
}

async function planespotterPhoto(reg: string): Promise<{ url: string; thumbnail: string; photographer?: string; link?: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(`${PLANESPOTTERS_BASE}/reg/${encodeURIComponent(reg)}`, {
      headers: { Accept: "application/json", "User-Agent": "SimPilot.AI/1.0" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    const photo = data?.photos?.[0];
    if (!photo) return null;
    return {
      url: photo.thumbnail_large?.src || photo.thumbnail?.src,
      thumbnail: photo.thumbnail?.src,
      photographer: photo.photographer,
      link: photo.link,
    };
  } catch (e) {
    console.warn("Planespotters error", (e as Error).message);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const rawIdent = url.searchParams.get("ident") || "";
    const ident = clean(rawIdent);
    if (!ident || ident.length < 2 || ident.length > 10) {
      return new Response(JSON.stringify({ error: "Provide ?ident=<tail or callsign> (2–10 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FLIGHTAWARE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "FlightAware not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Aircraft owner/type info (registration redacted by FA for privacy)
    const aircraftInfo = await faGet(`/aircraft/${encodeURIComponent(ident)}`, apiKey);

    // 2) Recent flights (last 14 days). Limit to 10.
    const flightsResp = await faGet(`/flights/${encodeURIComponent(ident)}?max_pages=1`, apiKey);
    const flights = Array.isArray(flightsResp?.flights) ? flightsResp.flights.slice(0, 10) : [];

    // 3) Live status — is the aircraft currently airborne?
    const live = flights.find((f: any) => f?.actual_off && !f?.actual_on);

    // 4) Photo from Planespotters (treat ident as registration; gracefully null if not found)
    const photo = await planespotterPhoto(ident);

    const recent = flights.map((f: any) => ({
      ident: f.ident || f.ident_iata || null,
      operator: f.operator_iata || f.operator || null,
      origin: f?.origin?.code_iata || f?.origin?.code || null,
      origin_name: f?.origin?.name || null,
      destination: f?.destination?.code_iata || f?.destination?.code || null,
      destination_name: f?.destination?.name || null,
      scheduled_out: f.scheduled_out || null,
      actual_out: f.actual_out || null,
      actual_off: f.actual_off || null,
      actual_on: f.actual_on || null,
      actual_in: f.actual_in || null,
      status: f.status || null,
      progress_percent: f.progress_percent ?? null,
    }));

    const aircraft = aircraftInfo
      ? {
          ident: aircraftInfo.ident || ident,
          type: aircraftInfo.type || aircraftInfo.aircraft_type || null,
          description: aircraftInfo.description || null,
          manufacturer: aircraftInfo.manufacturer || null,
          model: aircraftInfo.model || null,
          owner: aircraftInfo.owner || null,
          engine_count: aircraftInfo.engine_count ?? null,
          engine_type: aircraftInfo.engine_type || null,
        }
      : { ident, type: null, description: null };

    return new Response(
      JSON.stringify({
        ident,
        is_live: !!live,
        live_flight: live
          ? {
              ident: live.ident,
              origin: live?.origin?.code_iata || live?.origin?.code || null,
              destination: live?.destination?.code_iata || live?.destination?.code || null,
              progress_percent: live.progress_percent ?? null,
              actual_off: live.actual_off,
            }
          : null,
        aircraft,
        photo,
        recent_flights: recent,
        sources: {
          flightaware: !!aircraftInfo || flights.length > 0,
          planespotters: !!photo,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("aircraft-lookup error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
