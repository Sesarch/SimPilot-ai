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

    // 2) Recent flights (last 14 days). Limit to 12.
    const flightsResp = await faGet(`/flights/${encodeURIComponent(ident)}?max_pages=1`, apiKey);
    const flightsRaw = Array.isArray(flightsResp?.flights) ? flightsResp.flights.slice(0, 12) : [];

    // Sort by best-known timestamp desc (most recent / next-upcoming first)
    const tsOf = (f: any) =>
      new Date(f.actual_off || f.actual_out || f.scheduled_off || f.scheduled_out || 0).getTime();
    flightsRaw.sort((a: any, b: any) => tsOf(b) - tsOf(a));

    // 3) Live status — is the aircraft currently airborne?
    const live = flightsRaw.find((f: any) => f?.actual_off && !f?.actual_on);

    // Detect whether ident behaves like a tail (single registration across rows)
    // vs a callsign/flight-number (multiple registrations).
    const registrations = new Set<string>();
    for (const f of flightsRaw) {
      if (f?.registration) registrations.add(String(f.registration).toUpperCase());
    }
    const isTail = registrations.size === 1 || (registrations.size === 0 && /^N[0-9]/.test(ident));
    const identKind: "tail" | "callsign" | "unknown" =
      registrations.size > 1 ? "callsign" : isTail ? "tail" : "unknown";

    // 4) Photo from Planespotters — try ident first, then any detected registration
    let photo = await planespotterPhoto(ident);
    if (!photo && registrations.size === 1) {
      photo = await planespotterPhoto([...registrations][0]);
    }

    const recent = flightsRaw.map((f: any) => {
      const off = f.actual_off || null;
      const on = f.actual_on || null;
      let duration_min: number | null = null;
      if (off && on) {
        duration_min = Math.max(0, Math.round((new Date(on).getTime() - new Date(off).getTime()) / 60000));
      }
      const phase: "completed" | "in_air" | "scheduled" =
        off && on ? "completed" : off && !on ? "in_air" : "scheduled";
      return {
        ident: f.ident || f.ident_iata || null,
        operator: f.operator_iata || f.operator || null,
        registration: f.registration || null,
        aircraft_type: f.aircraft_type || null,
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
        duration_min,
        phase,
      };
    });

    // Fallback type derivation from flight rows when /aircraft/{ident} is empty
    const firstType = flightsRaw.find((f: any) => f.aircraft_type)?.aircraft_type || null;
    const firstReg = registrations.size === 1 ? [...registrations][0] : null;

    const aircraft = aircraftInfo
      ? {
          ident: aircraftInfo.ident || ident,
          type: aircraftInfo.type || aircraftInfo.aircraft_type || firstType,
          description: aircraftInfo.description || null,
          manufacturer: aircraftInfo.manufacturer || null,
          model: aircraftInfo.model || null,
          owner: aircraftInfo.owner || null,
          engine_count: aircraftInfo.engine_count ?? null,
          engine_type: aircraftInfo.engine_type || null,
        }
      : {
          ident: firstReg || ident,
          type: firstType,
          description: firstType ? `Aircraft type ${firstType}` : null,
        };

    return new Response(
      JSON.stringify({
        ident,
        ident_kind: identKind,
        resolved_registration: firstReg,
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
          flightaware: !!aircraftInfo || flightsRaw.length > 0,
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
