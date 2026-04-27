// Returns a realistic ATIS broadcast string (and information letter) for an
// airport. Strategy:
//   1. Try FAA D-ATIS (datis.clowd.io) — official US digital ATIS text.
//   2. Try VATSIM datafeed v3 → look for a text ATIS for this ICAO.
//   3. Fallback: fetch latest METAR from aviationweather.gov and synthesize a
//      plain-English ATIS using Lovable AI Gateway (Gemini Flash).
//
// We also probe LiveATC for a public ATIS audio stream URL and return it as
// `audioUrl` when available so the client can play the real broadcast.
//
// Response: { source: "datis"|"vatsim"|"synth", info, text, icao, freq, audioUrl? }
// Errors: { error } with appropriate status.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AWC_METAR = "https://aviationweather.gov/api/data/metar";
const VATSIM_FEED = "https://data.vatsim.net/v3/vatsim-data.json";
const DATIS_URL = "https://datis.clowd.io/api"; // /api/<ICAO> → [{type:'arr'|'dep'|'combined', datis: '...'}]
const AI_GW = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Public ATIS audio streams hosted on LiveATC. Many busy airports publish a
// dedicated ATIS-only feed at this URL pattern (lowercase ICAO, "_atis"). We
// HEAD-probe before returning so the client only attempts to play live feeds
// that are actually online.
function liveAtcAtisUrl(icao: string): string {
  return `https://d.liveatc.net/${icao.toLowerCase()}_atis`;
}

async function probeLiveAtcAtis(icao: string): Promise<string | null> {
  const url = liveAtcAtisUrl(icao);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    // LiveATC returns 200 + audio/mpeg when a feed is live, 404 otherwise.
    const r = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!/audio|mpeg|octet-stream/i.test(ct)) return null;
    return url;
  } catch {
    return null;
  }
}

async function tryDatis(icao: string): Promise<{ text: string; info: string } | null> {
  // FAA D-ATIS only covers US airports (ICAO starting with K, P, T, etc.).
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(`${DATIS_URL}/${icao.toUpperCase()}`, {
      headers: { "User-Agent": "simpilot-atc/1.0", Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    if (!Array.isArray(data) || data.length === 0) return null;
    // Prefer combined > arrival > departure.
    const pick =
      data.find((d: any) => d.type === "combined") ||
      data.find((d: any) => d.type === "arr") ||
      data[0];
    const text: string = String(pick?.datis || "").trim();
    if (!text) return null;
    // Extract information letter from "...INFO BRAVO..." or "...INFORMATION B..."
    const m = text.match(/INFO(?:RMATION)?\s+([A-Z])(?:\s|\.|,)/i);
    const info = m ? m[1].toUpperCase() : infoLetterFromTime();
    return { text, info };
  } catch {
    return null;
  }
}

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
    let airportName: string | undefined;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      icao = icao ?? body.icao;
      freq = freq ?? body.freq;
      airportName = body.airportName;
    }
    if (!icao || !/^[A-Z0-9]{3,4}$/i.test(icao)) {
      return new Response(JSON.stringify({ error: "icao required (3–4 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    icao = icao.toUpperCase();

    // Probe LiveATC for a real audio stream in parallel with text lookups.
    const audioPromise = probeLiveAtcAtis(icao);

    // Build a CORS-safe proxy URL the browser can hit even when the direct
    // LiveATC URL is blocked. Always returned when the direct probe succeeds —
    // the client will prefer this for playback. Force https because the
    // request to this function arrives over plain http internally even when
    // the public URL is https.
    const reqUrl = new URL(req.url);
    const origin = `https://${reqUrl.host}`;
    const proxyAudioUrlFor = (i: string) =>
      `${origin}/functions/v1/atc-atis-stream?icao=${encodeURIComponent(i)}`;

    // 1) FAA D-ATIS — official US text broadcast.
    const datis = await tryDatis(icao);
    if (datis) {
      const audioUrl = await audioPromise;
      return new Response(JSON.stringify({
        source: "datis", icao, freq, info: datis.info, text: datis.text,
        audioUrl, proxyAudioUrl: audioUrl ? proxyAudioUrlFor(icao) : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) VATSIM ATIS (online controllers).
    const vatsim = await tryVatsim(icao);
    if (vatsim) {
      const audioUrl = await audioPromise;
      return new Response(JSON.stringify({
        source: "vatsim", icao, freq, info: vatsim.info, text: vatsim.text,
        audioUrl, proxyAudioUrl: audioUrl ? proxyAudioUrlFor(icao) : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Synthesize from METAR (worldwide fallback).
    const metar = await fetchMetar(icao);
    const info = infoLetterFromTime();
    const audioUrl = await audioPromise;
    if (!metar) {
      const text = `${airportName || icao} information ${info}, weather not available. Advise on initial contact you have information ${info}.`;
      return new Response(JSON.stringify({
        source: "synth", icao, freq, info, text,
        audioUrl, proxyAudioUrl: audioUrl ? proxyAudioUrlFor(icao) : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const text = await synthAtisFromMetar(icao, metar, info, airportName);
    return new Response(JSON.stringify({
      source: "synth", icao, freq, info, text, metar,
      audioUrl, proxyAudioUrl: audioUrl ? proxyAudioUrlFor(icao) : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
