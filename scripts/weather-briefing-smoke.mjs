// Live smoke test for the local 25 NM weather-briefing edge function.
// Skipped automatically unless WEATHER_SMOKE_URL is set (CI sets it from
// VITE_SUPABASE_URL). Verifies that a real departure ICAO returns a METAR,
// a 25 NM bbox, and resolved coordinates.

const base = process.env.WEATHER_SMOKE_URL;
const anon = process.env.WEATHER_SMOKE_ANON_KEY;
const departure = process.env.WEATHER_SMOKE_AIRPORT || "KBOS";

if (!base || !anon) {
  console.log("⏭  WEATHER_SMOKE_URL / WEATHER_SMOKE_ANON_KEY not set — skipping live briefing smoke.");
  process.exit(0);
}

const url = `${base.replace(/\/$/, "")}/functions/v1/weather-briefing`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${anon}`,
    apikey: anon,
  },
  body: JSON.stringify({ departure }),
});

if (!res.ok) {
  console.error(`✗ weather-briefing returned ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();
const checks = [
  ["radius_nm === 25", data.radius_nm === 25],
  ["departure echoed", data.departure === departure.toUpperCase()],
  ["coords resolved", data.coords && typeof data.coords.lat === "number"],
  ["bbox present", typeof data.bbox === "string" && data.bbox.split(",").length === 4],
  ["metar string", typeof data.metar === "string" && data.metar.length > 10],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? `✅ ${name}` : `❌ ${name}`);
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n✗ ${failed} check(s) failed`);
  process.exit(1);
}
console.log(`\n✓ Local 25 NM weather briefing smoke passed for ${departure}`);
