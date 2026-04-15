import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENSKY_API = "https://opensky-network.org/api/states/all";

// Realistic mock flight data covering major US routes
// Format matches OpenSky states: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
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

  // Add slight position jitter to make it feel live
  return routes.map((r) => {
    const jitterLon = (Math.random() - 0.5) * 0.5;
    const jitterLat = (Math.random() - 0.5) * 0.5;
    return [
      r.icao, r.call, r.country, now, now,
      r.lon + jitterLon, r.lat + jitterLat,
      r.alt, r.gnd, r.vel, r.hdg, r.vr,
      null, r.alt + 30, r.sqk, false, 0,
    ];
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lamin = url.searchParams.get("lamin");
    const lamax = url.searchParams.get("lamax");
    const lomin = url.searchParams.get("lomin");
    const lomax = url.searchParams.get("lomax");

    const params = new URLSearchParams();
    if (lamin) params.set("lamin", lamin);
    if (lamax) params.set("lamax", lamax);
    if (lomin) params.set("lomin", lomin);
    if (lomax) params.set("lomax", lomax);

    const apiUrl = `${OPENSKY_API}${params.toString() ? `?${params}` : ""}`;

    // Attempt real API with a 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({ ...data, _source: "live" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Non-OK response — fall through to mock
    } catch (_fetchErr) {
      clearTimeout(timeoutId);
      // Timeout or network error — fall through to mock
    }

    // Return mock data as fallback
    console.log("OpenSky API unavailable, returning mock flight data");
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
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
