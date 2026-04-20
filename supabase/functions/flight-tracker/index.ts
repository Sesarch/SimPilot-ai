import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENSKY_API = "https://opensky-network.org/api/states/all";
const ADSBEX_RAPID_API = "https://adsbexchange-com1.p.rapidapi.com/v2/lat/";
const ADSB_LOL_API = "https://api.adsb.lol/v2/lat/";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
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

// Try OpenSky with optional credentials
async function tryOpenSky(params: URLSearchParams): Promise<Response | null> {
  const username = Deno.env.get("OPENSKY_USERNAME");
  const password = Deno.env.get("OPENSKY_PASSWORD");

  const apiUrl = `${OPENSKY_API}${params.toString() ? `?${params}` : ""}`;
  const headers: Record<string, string> = {};

  const hasAuth = !!(username && password);
  console.log(`OpenSky request: auth=${hasAuth}, url=${apiUrl}`);

  if (hasAuth) {
    headers["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(apiUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      console.log(`OpenSky success: status=${res.status}`);
      return res;
    }
    const body = await res.text().catch(() => "");
    console.log(`OpenSky returned ${res.status}: ${body.slice(0, 200)}`);
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.log(`OpenSky fetch failed: ${getErrorMessage(err)}`);
    return null;
  }
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

// adsb.lol caps radius at 250 nm per request. To cover a wide bbox we tile it.
const ADSB_LOL_MAX_RADIUS_NM = 250;

function buildAdsbLolTiles(lamin: string, lamax: string, lomin: string, lomax: string) {
  const south = Number(lamin);
  const north = Number(lamax);
  const west = Number(lomin);
  const east = Number(lomax);

  // Tile size in degrees: 250 nm ≈ 4.17° latitude. Use 4° spacing so circles overlap slightly.
  const tileDeg = 4;
  const tiles: { lat: string; lon: string; radius: string }[] = [];

  for (let lat = south; lat <= north; lat += tileDeg) {
    // Adjust longitude step by latitude to keep ~250nm coverage
    const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    const lonStep = tileDeg / cosLat;
    for (let lon = west; lon <= east; lon += lonStep) {
      tiles.push({
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        radius: String(ADSB_LOL_MAX_RADIUS_NM),
      });
    }
  }

  // Cap total tile count to avoid abuse / timeouts
  const MAX_TILES = 36;
  if (tiles.length > MAX_TILES) {
    // Sample uniformly
    const step = tiles.length / MAX_TILES;
    const sampled: typeof tiles = [];
    for (let i = 0; i < MAX_TILES; i++) sampled.push(tiles[Math.floor(i * step)]);
    return sampled;
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
    const lamin = url.searchParams.get("lamin") || "25";
    const lamax = url.searchParams.get("lamax") || "50";
    const lomin = url.searchParams.get("lomin") || "-130";
    const lomax = url.searchParams.get("lomax") || "-60";

    const params = new URLSearchParams();
    params.set("lamin", lamin);
    params.set("lamax", lamax);
    params.set("lomin", lomin);
    params.set("lomax", lomax);

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