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
async function tryFlightAware(lamin: string, lamax: string, lomin: string, lomax: string): Promise<any | null> {
  const apiKey = Deno.env.get("FLIGHTAWARE_API_KEY");
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Bounding box query: -latlong "minLat minLon maxLat maxLon"
    const query = `-latlong "${lamin} ${lomin} ${lamax} ${lomax}"`;
    const url = `${FLIGHTAWARE_API}/flights/search/positions?query=${encodeURIComponent(query)}&max_pages=1`;

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
      console.log(`FlightAware returned ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const positions = Array.isArray(data?.positions) ? data.positions : [];
    if (positions.length === 0) return null;

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

    console.log(`FlightAware: returning ${states.length} aircraft`);
    return { time: now, states, _source: "live", _provider: "flightaware" };
  } catch (err) {
    clearTimeout(timeoutId);
    console.log(`FlightAware fetch failed: ${getErrorMessage(err)}`);
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
    // Down-sample large traces to keep the polyline fast.
    const stride = trace.length > 1500 ? Math.ceil(trace.length / 1500) : 1;
    const points = [] as Array<{ t: number; lat: number; lon: number; alt: number | null; gs: number | null }>;
    for (let i = 0; i < trace.length; i += stride) {
      const p = trace[i];
      if (!p || p.length < 3) continue;
      const altRaw = p[3];
      points.push({
        t: Math.round(baseTs + Number(p[0] || 0)),
        lat: Number(p[1]),
        lon: Number(p[2]),
        alt: altRaw === "ground" ? 0 : (typeof altRaw === "number" ? altRaw : null),
        gs: typeof p[4] === "number" ? p[4] : null,
      });
    }
    return new Response(
      JSON.stringify({
        hex: h,
        registration: data?.r ?? null,
        type: data?.t ?? null,
        description: data?.desc ?? null,
        owner: data?.ownOp ?? null,
        timestamp: baseTs,
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

    // Convert ADS-B Exchange format to OpenSky-compatible states
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

    return { time: now, states, _source: "live" };
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
  return { time: now, states, _source: "live" };
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

    const lamin = url.searchParams.get("lamin") || "25";
    const lamax = url.searchParams.get("lamax") || "50";
    const lomin = url.searchParams.get("lomin") || "-130";
    const lomax = url.searchParams.get("lomax") || "-60";

    const params = new URLSearchParams();
    params.set("lamin", lamin);
    params.set("lamax", lamax);
    params.set("lomin", lomin);
    params.set("lomax", lomax);

    // Detect logged-in user via JWT presence (we don't need to validate — just check intent).
    // Anonymous users use anon key; signed-in users send a real user JWT (3-part, sub != anon).
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    let isAuthenticated = false;
    if (token && token.split(".").length === 3) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        isAuthenticated = !!payload?.sub && payload?.role === "authenticated";
      } catch { /* not a user JWT */ }
    }

    // Strategy 0 (PREMIUM, auth-only): FlightAware AeroAPI
    if (isAuthenticated) {
      const faData = await tryFlightAware(lamin, lamax, lomin, lomax);
      if (faData) {
        console.log(`FlightAware returned ${faData.states?.length || 0} aircraft (premium)`);
        return new Response(JSON.stringify(faData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 1: Try adsb.lol live feed (no key required)
    const adsbLolData = await tryAdsbLol(lamin, lamax, lomin, lomax);
    if (adsbLolData) {
      console.log(`adsb.lol returned ${adsbLolData.states?.length || 0} aircraft`);
      return new Response(JSON.stringify(adsbLolData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strategy 2: Try OpenSky API (with auth if available)
    const openSkyRes = await tryOpenSky(params);
    if (openSkyRes) {
      const data = await openSkyRes.json();
      console.log(`OpenSky returned ${data.states?.length || 0} aircraft`);
      return new Response(JSON.stringify({ ...data, _source: "live" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strategy 3: Try ADS-B Exchange via RapidAPI
    const adsbData = await tryADSBExchange(lamin, lamax, lomin, lomax);
    if (adsbData) {
      console.log(`ADS-B Exchange returned ${adsbData.states?.length || 0} aircraft`);
      return new Response(JSON.stringify(adsbData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strategy 4: Fallback to mock data
    console.log("All live sources unavailable, returning mock flight data");
    const mockData = {
      time: Math.floor(Date.now() / 1000),
      states: generateMockStates(),
      _source: "demo",
    };

    return new Response(JSON.stringify(mockData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: getErrorMessage(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});