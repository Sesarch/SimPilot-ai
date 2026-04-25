// Returns a realistic ATIS broadcast string (and information letter) for an
// airport. Strategy:
//   1. Try VATSIM datafeed v3 → look for a text ATIS for this ICAO.
//   2. Fallback: fetch latest METAR from aviationweather.gov and synthesize a
//      plain-English ATIS using Lovable AI Gateway (Gemini Flash).
//
// Response: { source: "vatsim" | "synth", info: "B", text: "...", icao, freq }
// Errors: { error } with appropriate status.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AWC_METAR = "https://aviationweather.gov/api/data/metar";
const VATSIM_FEED = "https://data.vatsim.net/v3/vatsim-data.json";
const AI_GW = "https://ai.gateway.lovable.dev/v1/chat/completions";

const PHONETIC = ["Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India","Juliett","Kilo","Lima","Mike","November","Oscar","Papa","Quebec","Romeo","Sierra","Tango","Uniform","Victor","Whiskey","X-ray","Yankee","Zulu"];

function infoLetterFromTime(): string {
  // Rotates roughly hourly; keeps the same letter for ~1 hour windows so
  // repeated tunes within the hour stay consistent.
  const hour = new Date().getUTCHours();
  return PHONETIC[hour % 26];
}

async function tryVatsim(icao: string): Promise<{ text: string; info: string } | null> {
  try {
    const r = await fetch(VATSIM_FEED, { headers: { "User-Agent": "simpilot-atc/1.0" } });
    if (!r.ok) return null;
    const data = await r.json();
    const atis = (data.atis ?? []).find((a: any) =>
      String(a.callsign || "").toUpperCase().startsWith(icao.toUpperCase()) &&
      String(a.callsign || "").toUpperCase().includes("ATIS"),
    );
    if (!atis) return null;
    const text: string = Array.isArray(atis.text_atis) ? atis.text_atis.join(" ") : (atis.text_atis ?? "");
    if (!text.trim()) return null;
    const info: string = atis.atis_code || infoLetterFromTime();
    return { text: text.trim(), info };
  } catch {
    return null;
  }
}

async function fetchMetar(icao: string): Promise<string | null> {
  try {
    const r = await fetch(`${AWC_METAR}?ids=${icao}&format=raw&taf=false&hours=2`);
    if (!r.ok) return null;
    const txt = (await r.text()).trim();
    if (!txt) return null;
    const line = txt.split("\n").map((l) => l.trim()).find((l) => l.toUpperCase().startsWith(icao.toUpperCase()));
    return line ?? txt.split("\n")[0];
  } catch {
    return null;
  }
}

async function synthAtisFromMetar(icao: string, metar: string, info: string, airportName?: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const displayName = airportName || icao;
  if (!apiKey) {
    return `${displayName} information ${info}, automated weather: ${metar}. Advise on initial contact you have information ${info}.`;
  }
  const prompt = `Convert this METAR into a SHORT, plain-English ATIS broadcast for ${displayName} (${icao}). Keep it under 90 words.
Begin with EXACTLY: "${displayName} Airport, information ${info}, " — do NOT invent a different airport name.
Then include time (Zulu from METAR), wind, visibility, sky condition, temp/dewpoint, altimeter, runway in use (pick most into-the-wind), notes ("Notice to airmen, none."), and end with: "Advise on initial contact you have information ${info}."
Numbers spoken individually ("two niner point niner two"), "niner" for 9. No markdown, just one paragraph.

METAR: ${metar}`;
  try {
    const r = await fetch(AI_GW, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are an ATIS broadcast generator. Output the broadcast text only." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`gw ${r.status}`);
    const j = await r.json();
    const txt = j?.choices?.[0]?.message?.content?.trim();
    return txt || `${icao} information ${info}: ${metar}`;
  } catch {
    return `${icao} information ${info}: ${metar}. Advise on initial contact you have information ${info}.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let icao = url.searchParams.get("icao");
    let freq = url.searchParams.get("freq") ?? undefined;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      icao = icao ?? body.icao;
      freq = freq ?? body.freq;
    }
    if (!icao || !/^[A-Z0-9]{3,4}$/i.test(icao)) {
      return new Response(JSON.stringify({ error: "icao required (3–4 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    icao = icao.toUpperCase();

    const vatsim = await tryVatsim(icao);
    if (vatsim) {
      return new Response(JSON.stringify({ source: "vatsim", icao, freq, info: vatsim.info, text: vatsim.text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metar = await fetchMetar(icao);
    const info = infoLetterFromTime();
    if (!metar) {
      // Last-ditch generic ATIS so the radio doesn't go silent.
      const text = `${icao} information ${info}, weather not available. Advise on initial contact you have information ${info}.`;
      return new Response(JSON.stringify({ source: "synth", icao, freq, info, text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const text = await synthAtisFromMetar(icao, metar, info);
    return new Response(JSON.stringify({ source: "synth", icao, freq, info, text, metar }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
