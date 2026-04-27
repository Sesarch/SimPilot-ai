import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


const ADSBEX_RAPID_API = "https://adsbexchange-com1.p.rapidapi.com/v2/lat/";
const ADSB_LOL_API = "https://api.adsb.lol/v2/lat/";
const ADSB_LOL_TRACE_BASE = "https://adsb.lol/data/traces";
const ADSBDB_API = "https://api.adsbdb.com/v0";
const FLIGHTAWARE_API = "https://aeroapi.flightaware.com/aeroapi";

// FlightAware AeroAPI — premium live data for authenticated users.
// Uses the /flights/search endpoint with a bounding box query.
// Cost: ~$0.005/query (search) — much cheaper than per-position polling.
type FaDiagnostics = {
  configured: boolean;
  status: number | null;
  ok: boolean;
  error: string | null;
  message: string | null;
  durationMs: number | null;
  endpoint: string;
  checkedAt: number;
};

const FA_DIAG: { last: FaDiagnostics } = {
  last: {
    configured: false, status: null, ok: false, error: null, message: null,
    durationMs: null, endpoint: "/flights/search/positions", checkedAt: 0,
  },
};

async function tryFlightAware(lamin: string, lamax: string, lomin: string, lomax: string): Promise<any | null> {
  const apiKey = Deno.env.get("FLIGHTAWARE_API_KEY");
  const startedAt = Date.now();
  if (!apiKey) {
    FA_DIAG.last = {
      configured: false, status: null, ok: false,
      error: "missing_api_key",
      message: "FLIGHTAWARE_API_KEY secret is not set.",
      durationMs: null, endpoint: "/flights/search/positions", checkedAt: startedAt,
    };
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Bounding box query: -latlong "minLat minLon maxLat maxLon"
    // FlightAware requires lat ∈ [-90,90] and lon ∈ [-180,180]; clamp to avoid 400 errors
    // when the map viewport wraps the antimeridian (e.g. lon < -180 or > 180).
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    const minLat = clamp(Number(lamin), -90, 90).toFixed(4);
    const maxLat = clamp(Number(lamax), -90, 90).toFixed(4);
    const minLon = clamp(Number(lomin), -180, 180).toFixed(4);
    const maxLon = clamp(Number(lomax), -180, 180).toFixed(4);
    const query = `-latlong "${minLat} ${minLon} ${maxLat} ${maxLon}"`;
    const params = new URLSearchParams({ query, max_pages: "1" });
    const url = `${FLIGHTAWARE_API}/flights/search/positions?${params.toString()}`;

    console.log(`FlightAware: requesting ${url}`);

    const res = await fetch(url, {
      headers: {
        "x-apikey": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log(`FlightAware returned ${res.status} for query='${query}': ${body.slice(0, 400)}`);
      let parsedMsg: string | null = null;
      try { parsedMsg = JSON.parse(body)?.title || JSON.parse(body)?.detail || null; } catch { /* noop */ }
      FA_DIAG.last = {
        configured: true,
        status: res.status,
        ok: false,
        error: res.status === 400 ? "plan_or_query_rejected"
          : res.status === 401 ? "unauthorized"
          : res.status === 402 ? "payment_required"
          : res.status === 403 ? "forbidden_plan_tier"
          : res.status === 429 ? "rate_limited"
          : `http_${res.status}`,
        message: parsedMsg || body.slice(0, 240) || `HTTP ${res.status}`,
        durationMs: Date.now() - startedAt,
        endpoint: "/flights/search/positions",
        checkedAt: startedAt,
      };
      return null;
    }

    const data = await res.json();
    const positions = Array.isArray(data?.positions) ? data.positions : [];
    const durationMs = Date.now() - startedAt;
    if (positions.length === 0) {
      FA_DIAG.last = {
        configured: true, status: res.status, ok: true,
        error: "empty_response",
        message: "FlightAware returned 200 but no aircraft in this bounding box.",
        durationMs, endpoint: "/flights/search/positions", checkedAt: startedAt,
      };
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const states = positions
      .filter((p: any) => p.latitude != null && p.longitude != null)
      .slice(0, 600)
      .map((p: any) => {
        const altFeet = (p.altitude || 0) * 100; // FlightAware altitude is in 100s of ft
        const gsKnots = p.groundspeed || 0;
        return [
          (p.fa_flight_id || p.ident || "").toLowerCase().slice(0, 6),
          (p.ident || "").padEnd(8),
          p.origin?.code_iata || p.origin?.code || "",
          now,
          now,
          p.longitude,
          p.latitude,
          altFeet * 0.3048,                  // ft → m
          altFeet === 0,                     // on ground if altitude is 0
          gsKnots * 0.514444,                // knots → m/s
          p.heading || 0,
          (p.update_type === "P" ? 0 : 0),   // FA doesn't expose vertical rate here
          null,
          altFeet * 0.3048,
          null,                              // squawk not in this endpoint
          false,
          0,
        ];
      });

    FA_DIAG.last = {
      configured: true, status: res.status, ok: true, error: null,
      message: `OK — ${states.length} aircraft`,
      durationMs, endpoint: "/flights/search/positions", checkedAt: startedAt,
    };
    console.log(`FlightAware: returning ${states.length} aircraft`);
    return { time: now, states, _source: "live", _provider: "flightaware" };
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = getErrorMessage(err);
    console.log(`FlightAware fetch failed: ${msg}`);
    FA_DIAG.last = {
      configured: true, status: null, ok: false,
      error: msg.includes("aborted") ? "timeout" : "network_error",
      message: msg,
      durationMs: Date.now() - startedAt,
      endpoint: "/flights/search/positions",
      checkedAt: startedAt,
    };
    return null;
  }
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

// --- Aircraft metadata + recent flight ---------------------------------------
// Combines adsbdb.com (registration → type / owner / photo) with adsb.lol
// callsign + registration live lookup so the search bar can show a meaningful
// result even when the aircraft is not currently airborne.
async function lookupAircraft(query: string): Promise<Response> {
  const q = query.trim().toUpperCase();
  if (!q) {
    return new Response(JSON.stringify({ error: "Empty query" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result: Record<string, unknown> = { query: q };

  const safe = async <T,>(p: Promise<T>): Promise<T | null> => {
    try { return await p; } catch { return null; }
  };

  // Try adsbdb registration / mode-s endpoints in parallel.
  const [byRegistration, byModeS, liveByCallsign, liveByRegistration, liveByHex] = await Promise.all([
    safe(fetch(`${ADSBDB_API}/aircraft/${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null)),
    safe(fetch(`${ADSBDB_API}/mode-s/${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null)),
    safe(fetch(`https://api.adsb.lol/v2/callsign/${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null)),
    safe(fetch(`https://api.adsb.lol/v2/registration/${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null)),
    safe(fetch(`https://api.adsb.lol/v2/icao/${encodeURIComponent(q.toLowerCase())}`).then(r => r.ok ? r.json() : null)),
  ]);

  const meta = (byRegistration as any)?.response?.aircraft || (byModeS as any)?.response?.aircraft || null;
  if (meta) {
    result.registration = meta.registration || null;
    result.icao24 = (meta.mode_s || "").toLowerCase() || null;
    result.type = meta.type || null;
    result.icaoType = meta.icao_type || null;
    result.manufacturer = meta.manufacturer || null;
    result.owner = meta.registered_owner || null;
    result.country = meta.registered_owner_country_name || null;
    result.photo = meta.url_photo || null;
    result.photoThumb = meta.url_photo_thumbnail || null;
  }

  const liveSources = [liveByCallsign, liveByRegistration, liveByHex] as any[];
  for (const src of liveSources) {
    const list = src?.ac;
    if (Array.isArray(list) && list.length) {
      const ac = list[0];
      result.live = {
        hex: ac.hex,
        flight: (ac.flight || "").trim() || null,
        registration: ac.r || null,
        type: ac.t || null,
        description: ac.desc || null,
        owner: ac.ownOp || null,
        lat: ac.lat ?? null,
        lon: ac.lon ?? null,
        altBaroFt: ac.alt_baro === "ground" ? 0 : (ac.alt_baro ?? null),
        gsKts: ac.gs ?? null,
        track: ac.track ?? null,
        squawk: ac.squawk ?? null,
        seen: ac.seen ?? null,
      };
      if (!result.icao24 && ac.hex) result.icao24 = String(ac.hex).toLowerCase();
      if (!result.registration && ac.r) result.registration = ac.r;
      if (!result.type && ac.t) result.type = ac.t;
      if (!result.owner && ac.ownOp) result.owner = ac.ownOp;
      if (!result.manufacturer && ac.desc) result.manufacturer = ac.desc;
      break;
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Historical track -------------------------------------------------------
// adsb.lol mirrors a CDN of full traces under /data/traces/<lastTwo>/trace_full_<hex>.json.
// Returned shape: [seconds_after_timestamp, lat, lon, alt|"ground", gs, track, ...]
async function lookupTrace(hex: string): Promise<Response> {
  const h = hex.trim().toLowerCase();
  if (!/^[a-f0-9]{6}$/.test(h)) {
    return new Response(JSON.stringify({ error: "Invalid ICAO24 hex" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const lastTwo = h.slice(-2);
  const url = `${ADSB_LOL_TRACE_BASE}/${lastTwo}/trace_full_${h}.json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Lovable-FlightTracker/1.0", "Accept-Encoding": "gzip" },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ trace: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const baseTs = Number(data?.timestamp ?? 0);
    const trace = Array.isArray(data?.trace) ? data.trace : [];

    // Parse raw trace into typed points (no down-sample yet).
    type Pt = { t: number; lat: number; lon: number; alt: number | null; gs: number | null; ground: boolean };
    const all: Pt[] = [];
    for (const p of trace) {
      if (!p || p.length < 3) continue;
      const altRaw = p[3];
      const ground = altRaw === "ground";
      const lat = Number(p[1]);
      const lon = Number(p[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      all.push({
        t: Math.round(baseTs + Number(p[0] || 0)),
        lat, lon,
        alt: ground ? 0 : (typeof altRaw === "number" ? altRaw : null),
        gs: typeof p[4] === "number" ? p[4] : null,
        ground,
      });
    }

    // Segment into discrete flights. A new flight starts after either:
    //   - an extended ground period (>= 10 min on ground), OR
    //   - a long telemetry gap (>= 30 min) between consecutive points.
    // We then return ONLY the most recent flight segment so the polyline shows
    // one flight, not days of history. If the aircraft is still airborne, the
    // last segment naturally extends to "now"; if it has landed, the last
    // segment ends at the most recent landing.
    const GROUND_BREAK_SEC = 10 * 60;
    const GAP_BREAK_SEC = 30 * 60;

    let lastSegmentStart = 0;
    let groundRunStart: number | null = null; // index of first ground point in current run
    for (let i = 0; i < all.length; i++) {
      const cur = all[i];
      const prev = i > 0 ? all[i - 1] : null;

      // Telemetry gap break.
      if (prev && cur.t - prev.t >= GAP_BREAK_SEC) {
        lastSegmentStart = i;
        groundRunStart = cur.ground ? i : null;
        continue;
      }

      if (cur.ground) {
        if (groundRunStart === null) groundRunStart = i;
        const runLen = cur.t - all[groundRunStart].t;
        // If this ground run is long enough, the *next* airborne point starts a new flight.
        if (runLen >= GROUND_BREAK_SEC) {
          // Mark: we'll move the segment start to the next non-ground sample we see.
          // Use a sentinel via groundRunStart; handled below.
        }
      } else {
        // Airborne: if we just exited a long ground run, this is a new flight.
        if (groundRunStart !== null) {
          const runLen = all[i - 1].t - all[groundRunStart].t;
          if (runLen >= GROUND_BREAK_SEC) {
            lastSegmentStart = i;
          }
        }
        groundRunStart = null;
      }
    }

    // Trim leading ground taxi from the chosen segment so the polyline starts
    // at takeoff (first airborne point of that flight).
    let segStart = lastSegmentStart;
    while (segStart < all.length && all[segStart].ground) segStart++;
    if (segStart >= all.length) segStart = lastSegmentStart;

    let segment = all.slice(segStart);

    // Trim trailing taxi after the last landing so the line ends at touchdown
    // (only when the aircraft is no longer airborne).
    if (segment.length > 0 && segment[segment.length - 1].ground) {
      let lastAir = segment.length - 1;
      while (lastAir >= 0 && segment[lastAir].ground) lastAir--;
      if (lastAir >= 0) segment = segment.slice(0, lastAir + 2); // include touchdown point
    }

    // Down-sample for polyline performance.
    const stride = segment.length > 1500 ? Math.ceil(segment.length / 1500) : 1;
    const points = [] as Array<{ t: number; lat: number; lon: number; alt: number | null; gs: number | null }>;
    for (let i = 0; i < segment.length; i += stride) {
      const s = segment[i];
      points.push({ t: s.t, lat: s.lat, lon: s.lon, alt: s.alt, gs: s.gs });
    }
    // Always include the final point.
    if (segment.length > 0) {
      const last = segment[segment.length - 1];
      const tail = points[points.length - 1];
      if (!tail || tail.t !== last.t) {
        points.push({ t: last.t, lat: last.lat, lon: last.lon, alt: last.alt, gs: last.gs });
      }
    }

    const flightStartTs = segment.length > 0 ? segment[0].t : baseTs;
    const flightEndTs = segment.length > 0 ? segment[segment.length - 1].t : baseTs;
    const isLive = segment.length > 0 && !segment[segment.length - 1].ground;

    return new Response(
      JSON.stringify({
        hex: h,
        registration: data?.r ?? null,
        type: data?.t ?? null,
        description: data?.desc ?? null,
        owner: data?.ownOp ?? null,
        timestamp: baseTs,
        flight_start: flightStartTs,
        flight_end: flightEndTs,
        is_live: isLive,
        points,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: getErrorMessage(err), trace: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

// Realistic mock flight data
function generateMockStates(): any[][] {
  const now = Math.floor(Date.now() / 1000);
  const routes = [
    { icao: "a1b2c3", call: "UAL1234 ", country: "United States", lon: -87.65, lat: 41.88, alt: 10668, vel: 230, hdg: 90, vr: 0, gnd: false, sqk: "1200" },
    { icao: "a2c4e6", call: "DAL456  ", country: "United States", lon: -73.78, lat: 40.64, alt: 0, vel: 0, hdg: 220, vr: 0, gnd: true, sqk: "1200" },
    { icao: "a3d5f7", call: "AAL789  ", country: "United States", lon: -118.41, lat: 33.94, alt: 11887, vel: 245, hdg: 45, vr: 2.5, gnd: false, sqk: "4523" },
    { icao: "a4e6g8", call: "SWA321  ", country: "United States", lon: -97.04, lat: 32.90, alt: 7620, vel: 195, hdg: 180, vr: -5.0, gnd: false, sqk: "3412" },
    { icao: "a5f7h9", call: "JBU555  ", country: "United States", lon: -71.01, lat: 42.37, alt: 9144, vel: 210, hdg: 270, vr: 0, gnd: false, sqk: "5674" },
    { icao: "a6g8i0", call: "SKW4412 ", country: "United States", lon: -122.38, lat: 37.62, alt: 3048, vel: 140, hdg: 310, vr: 8.0, gnd: false, sqk: "2345" },
    { icao: "a7h9j1", call: "FDX1001 ", country: "United States", lon: -85.74, lat: 38.17, alt: 12192, vel: 260, hdg: 60, vr: 0, gnd: false, sqk: "6712" },
    { icao: "a8i0k2", call: "UAL987  ", country: "United States", lon: -104.67, lat: 39.86, alt: 5486, vel: 170, hdg: 135, vr: -7.5, gnd: false, sqk: "1234" },
    { icao: "a9j1l3", call: "AAL222  ", country: "United States", lon: -80.29, lat: 25.80, alt: 10363, vel: 225, hdg: 350, vr: 1.2, gnd: false, sqk: "7654" },
    { icao: "b0k2m4", call: "DAL100  ", country: "United States", lon: -84.43, lat: 33.64, alt: 0, vel: 12, hdg: 90, vr: 0, gnd: true, sqk: "1200" },
    { icao: "b1l3n5", call: "SWA800  ", country: "United States", lon: -95.34, lat: 29.99, alt: 8534, vel: 205, hdg: 200, vr: -3.0, gnd: false, sqk: "3321" },
    { icao: "b2m4o6", call: "JBU102  ", country: "United States", lon: -77.04, lat: 38.85, alt: 6096, vel: 180, hdg: 30, vr: 5.5, gnd: false, sqk: "4456" },
    { icao: "b3n5p7", call: "ENY3456 ", country: "United States", lon: -112.01, lat: 33.43, alt: 4572, vel: 155, hdg: 260, vr: -9.0, gnd: false, sqk: "2200" },
    { icao: "b4o6q8", call: "ASA600  ", country: "United States", lon: -122.31, lat: 47.45, alt: 11278, vel: 240, hdg: 160, vr: 0, gnd: false, sqk: "5500" },
    { icao: "b5p7r9", call: "UAL333  ", country: "United States", lon: -93.22, lat: 44.88, alt: 9753, vel: 215, hdg: 110, vr: 0.8, gnd: false, sqk: "6600" },
    { icao: "b6q8s0", call: "DAL750  ", country: "United States", lon: -86.75, lat: 36.12, alt: 7010, vel: 190, hdg: 320, vr: -2.0, gnd: false, sqk: "7700" },
    { icao: "b7r9t1", call: "N172SP  ", country: "United States", lon: -81.68, lat: 28.43, alt: 914, vel: 55, hdg: 180, vr: 0, gnd: false, sqk: "1200" },
    { icao: "b8s0u2", call: "N456GA  ", country: "United States", lon: -117.19, lat: 32.73, alt: 1524, vel: 65, hdg: 270, vr: 2.0, gnd: false, sqk: "1200" },
    { icao: "b9t1v3", call: "CPA888  ", country: "Hong Kong", lon: -120.50, lat: 38.00, alt: 12497, vel: 265, hdg: 80, vr: 0, gnd: false, sqk: "4321" },
    { icao: "c0u2w4", call: "BAW117  ", country: "United Kingdom", lon: -74.50, lat: 40.00, alt: 11582, vel: 255, hdg: 250, vr: -0.5, gnd: false, sqk: "5432" },
  ];

  return routes.map((r) => {
    const jitterLon = (Math.random() - 0.5) * 0.5;
    const jitterLat = (Math.random() - 0.5) * 0.5;
    return [
      r.icao, r.call, r.country, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000),
      r.lon + jitterLon, r.lat + jitterLat,
      r.alt, r.gnd, r.vel, r.hdg, r.vr,
      null, r.alt + 30, r.sqk, false, 0,
    ];
  });
}

// Try ADS-B Exchange via RapidAPI (if key is configured)
async function tryADSBExchange(lamin: string, lamax: string, lomin: string, lomax: string): Promise<any | null> {
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
  if (!rapidApiKey) return null;

  // ADS-B Exchange uses center point + radius
  const centerLat = ((parseFloat(lamin) + parseFloat(lamax)) / 2).toFixed(4);
  const centerLon = ((parseFloat(lomin) + parseFloat(lomax)) / 2).toFixed(4);
  const dist = "250"; // nautical miles

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${ADSBEX_RAPID_API}${centerLat}/lon/${centerLon}/dist/${dist}/`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "adsbexchange-com1.p.rapidapi.com",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.log(`ADS-B Exchange returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data.ac || data.ac.length === 0) return null;

    // Convert ADS-B Exchange format to standard states array
    const now = Math.floor(Date.now() / 1000);
    const states = data.ac
      .filter((ac: any) => ac.lat != null && ac.lon != null)
      .slice(0, 300)
      .map((ac: any) => [
        ac.hex || "",
        (ac.flight || "").padEnd(8),
        "",
        now, now,
        ac.lon, ac.lat,
        (ac.alt_baro === "ground" ? 0 : (ac.alt_baro || 0)) * 0.3048, // feet to meters
        ac.alt_baro === "ground",
        (ac.gs || 0) * 0.514444, // knots to m/s
        ac.track || 0,
        (ac.baro_rate || 0) * 0.00508, // fpm to m/s
        null,
        (ac.alt_geom || ac.alt_baro || 0) * 0.3048,
        ac.squawk || null,
        false, 0,
      ]);

    return { time: now, states, _source: "live", _provider: "adsbexchange" };
  } catch (err) {
    clearTimeout(timeoutId);
    console.log(`ADS-B Exchange fetch failed: ${getErrorMessage(err)}`);
    return null;
  }
}

// adsb.lol caps radius at 250 nm per request (~4.17° lat). To cover a bbox we tile it.
const ADSB_LOL_MAX_RADIUS_NM = 250;
const MAX_TILES = 60; // Hard cap to avoid timeouts/abuse

function buildAdsbLolTiles(lamin: string, lamax: string, lomin: string, lomax: string) {
  const south = Number(lamin);
  const north = Number(lamax);
  const west = Number(lomin);
  const east = Number(lomax);
  const latSpan = Math.max(north - south, 0.01);
  const lonSpan = Math.max(east - west, 0.01);

  // Choose a tile spacing that fits within MAX_TILES while keeping coverage uniform.
  // 250 nm radius ≈ 4.17° lat. Spacing 7° gives slight overlap; for wider areas we widen
  // the spacing (and rely on the 250 nm circles' natural coverage even with small gaps).
  // We solve: ceil(latSpan/step) * ceil(lonSpan*cos(midLat)/step) <= MAX_TILES
  const midLat = (south + north) / 2;
  const cosMid = Math.max(Math.cos((midLat * Math.PI) / 180), 0.2);
  const lonSpanAdj = lonSpan * cosMid;
  // Start at preferred 7° step, increase if too many tiles
  let step = 7;
  for (let i = 0; i < 20; i++) {
    const nLat = Math.ceil(latSpan / step);
    const nLon = Math.ceil(lonSpanAdj / step);
    if (nLat * nLon <= MAX_TILES) break;
    step += 1;
  }

  const tiles: { lat: string; lon: string; radius: string }[] = [];
  // Center the grid so tiles cover edges symmetrically
  const nLat = Math.ceil(latSpan / step);
  const nLon = Math.ceil(lonSpanAdj / step);
  const latStart = south + (latSpan - (nLat - 1) * step) / 2;
  const lonStepDeg = step / cosMid;
  const lonStart = west + (lonSpan - (nLon - 1) * lonStepDeg) / 2;

  for (let i = 0; i < nLat; i++) {
    const lat = latStart + i * step;
    for (let j = 0; j < nLon; j++) {
      const lon = lonStart + j * lonStepDeg;
      tiles.push({
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        radius: String(ADSB_LOL_MAX_RADIUS_NM),
      });
    }
  }
  return tiles;
}

function mapAdsbAircraft(ac: any, now: number) {
  const altBaroFeet = ac.alt_baro === "ground"
    ? 0
    : typeof ac.alt_baro === "number"
      ? ac.alt_baro
      : Number(ac.alt_baro || 0);
  const altGeomFeet = typeof ac.alt_geom === "number"
    ? ac.alt_geom
    : Number(ac.alt_geom || altBaroFeet || 0);
  const gsKnots = typeof ac.gs === "number" ? ac.gs : Number(ac.gs || 0);
  const baroRateFpm = typeof ac.baro_rate === "number" ? ac.baro_rate : Number(ac.baro_rate || 0);

  return [
    ac.hex || "",
    (ac.flight || "").padEnd(8),
    ac.country || ac.dbFlags || "",
    now,
    now,
    ac.lon,
    ac.lat,
    altBaroFeet * 0.3048,
    ac.alt_baro === "ground",
    gsKnots * 0.514444,
    ac.track || 0,
    baroRateFpm * 0.00508,
    null,
    altGeomFeet * 0.3048,
    ac.squawk || null,
    false,
    0,
  ];
}

async function fetchAdsbLolTile(lat: string, lon: string, radius: string): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `${ADSB_LOL_API}${lat}/lon/${lon}/dist/${radius}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Lovable-FlightTracker/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.ac) ? data.ac : [];
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

async function tryAdsbLol(lamin: string, lamax: string, lomin: string, lomax: string): Promise<any | null> {
  const tiles = buildAdsbLolTiles(lamin, lamax, lomin, lomax);
  console.log(`adsb.lol: querying ${tiles.length} tile(s) for bbox lat ${lamin}..${lamax} lon ${lomin}..${lomax}`);

  const results = await Promise.all(tiles.map(t => fetchAdsbLolTile(t.lat, t.lon, t.radius)));

  const south = Number(lamin), north = Number(lamax), west = Number(lomin), east = Number(lomax);
  const seen = new Map<string, any>();
  for (const acList of results) {
    for (const ac of acList) {
      if (ac?.lat == null || ac?.lon == null || !ac?.hex) continue;
      if (ac.lat < south || ac.lat > north) continue;
      if (ac.lon < west || ac.lon > east) continue;
      if (!seen.has(ac.hex)) seen.set(ac.hex, ac);
    }
  }

  if (seen.size === 0) {
    console.log("adsb.lol: no aircraft after dedup/filter");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const states = Array.from(seen.values()).slice(0, 600).map((ac) => mapAdsbAircraft(ac, now));
  console.log(`adsb.lol: returning ${states.length} aircraft from ${tiles.length} tiles`);
  return { time: now, states, _source: "live", _provider: "adsblol" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (action === "lookup") {
      return await lookupAircraft(url.searchParams.get("q") || "");
    }
    if (action === "trace") {
      return await lookupTrace(url.searchParams.get("hex") || "");
    }
    if (action === "status") {
      return new Response(JSON.stringify({ flightaware: FA_DIAG.last }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lamin = url.searchParams.get("lamin") || "25";
    const lamax = url.searchParams.get("lamax") || "50";
    const lomin = url.searchParams.get("lomin") || "-130";
    const lomax = url.searchParams.get("lomax") || "-60";

    const params = new URLSearchParams();
    params.set("lamin", lamin);
    params.set("lamax", lamax);
    params.set("lomin", lomin);
    params.set("lomax", lomax);

    const respond = (payload: any) =>
      new Response(JSON.stringify({ ...payload, _flightaware: FA_DIAG.last }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Strategy 0 (PREMIUM): FlightAware AeroAPI — tried first whenever the key is configured.
    const faData = await tryFlightAware(lamin, lamax, lomin, lomax);
    if (faData) {
      console.log(`FlightAware returned ${faData.states?.length || 0} aircraft (premium)`);
      return respond(faData);
    }

    // Strategy 1: Try adsb.lol live feed (no key required)
    const adsbLolData = await tryAdsbLol(lamin, lamax, lomin, lomax);
    if (adsbLolData) {
      console.log(`adsb.lol returned ${adsbLolData.states?.length || 0} aircraft`);
      return respond(adsbLolData);
    }

    // Strategy 2: Try ADS-B Exchange via RapidAPI
    const adsbData = await tryADSBExchange(lamin, lamax, lomin, lomax);
    if (adsbData) {
      console.log(`ADS-B Exchange returned ${adsbData.states?.length || 0} aircraft`);
      return respond(adsbData);
    }

    // Strategy 3: Fallback to mock data
    console.log("All live sources unavailable, returning mock flight data");
    return respond({
      time: Math.floor(Date.now() / 1000),
      states: generateMockStates(),
      _source: "demo",
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: getErrorMessage(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});