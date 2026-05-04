// Pre-Flight Briefing edge function — focused on a single DEPARTURE airport
// and a 25 NM local practice-area radius. Returns METAR + TAF for the
// departure station plus nearby SIGMETs, AIRMETs and PIREPs so the AI can
// produce a Go/No-Go assessment instead of generic study material.

const AWC_BASE = "https://aviationweather.gov/api/data";
const NM_PER_DEG_LAT = 60;
const RADIUS_NM = 25;

const corsHeadersObj = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersObj, "Content-Type": "application/json" },
  });

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url);
  return r.ok ? await r.text() : "";
}
async function fetchJson<T = unknown>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function bbox(lat: number, lon: number, nm: number) {
  const dLat = nm / NM_PER_DEG_LAT;
  const dLon = nm / (NM_PER_DEG_LAT * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  // AWC bbox order: minLat,minLon,maxLat,maxLon
  return `${(lat - dLat).toFixed(3)},${(lon - dLon).toFixed(3)},${(lat + dLat).toFixed(3)},${(lon + dLon).toFixed(3)}`;
}

async function getStationCoords(id: string): Promise<{ lat: number; lon: number } | null> {
  const data = await fetchJson<Array<{ lat?: number; lon?: number; latitude?: number; longitude?: number }>>(
    `${AWC_BASE}/stationinfo?ids=${id}&format=json`,
  );
  const s = data?.[0];
  if (!s) return null;
  const lat = s.lat ?? s.latitude;
  const lon = s.lon ?? s.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lon };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersObj });

  try {
    const body = await req.json().catch(() => ({}));
    // Backward-compat: still accept `stations[]`; the FIRST entry is treated
    // as the departure airport. New callers should send `departure`.
    const departureRaw: string | undefined =
      body.departure ?? (Array.isArray(body.stations) ? body.stations[0] : undefined);
    const practiceArea: string | undefined = body.practiceArea ?? body.practice_area;

    const departure = (departureRaw ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(departure)) {
      return json({ error: "Valid departure airport identifier required" }, 400);
    }

    // ---- METAR / TAF for departure ----------------------------------------
    const metarUrl = `${AWC_BASE}/metar?ids=${departure}&format=raw&taf=false&hours=2`;
    const tafUrl = `${AWC_BASE}/taf?ids=${departure}&format=raw&metar=false`;
    const [metarText, tafText] = await Promise.all([fetchText(metarUrl), fetchText(tafUrl)]);

    let metar: string | undefined;
    for (const line of metarText.trim().split("\n")) {
      const cleaned = line.replace(/^(METAR|SPECI)\s+/, "").trim();
      if (/^[A-Z][A-Z0-9]{2,3}\s/.test(cleaned)) { metar = cleaned; break; }
    }
    const taf = tafText.trim() || undefined;

    // ---- Local hazards: SIGMET / AIRMET / PIREP within ~25 NM -------------
    const coords = await getStationCoords(departure);
    let sigmets: string[] = [];
    let airmets: string[] = [];
    let pireps: string[] = [];
    let bboxStr: string | null = null;

    if (coords) {
      bboxStr = bbox(coords.lat, coords.lon, RADIUS_NM);
      const [sigText, airText, pirepText] = await Promise.all([
        fetchText(`${AWC_BASE}/airsigmet?format=raw&type=sigmet&hazard=conv,turb,ice`),
        fetchText(`${AWC_BASE}/airsigmet?format=raw&type=airmet&hazard=turb,ice,ifr`),
        fetchText(`${AWC_BASE}/pirep?format=raw&age=2&bbox=${bboxStr}`),
      ]);
      // The airsigmet endpoint does not always honor bbox — keep raw blocks
      // so the AI can filter by name; PIREPs are already bbox-filtered.
      sigmets = sigText.trim().split(/\n\s*\n/).filter(Boolean).slice(0, 8);
      airmets = airText.trim().split(/\n\s*\n/).filter(Boolean).slice(0, 8);
      pireps = pirepText.trim().split("\n").filter(Boolean).slice(0, 15);
    }

    return json({
      departure,
      practiceArea: practiceArea ?? null,
      coords,
      radius_nm: RADIUS_NM,
      bbox: bboxStr,
      metar,
      taf,
      sigmets,
      airmets,
      pireps,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Weather briefing error:", error);
    return json({ error: "Failed to fetch weather data" }, 500);
  }
});
