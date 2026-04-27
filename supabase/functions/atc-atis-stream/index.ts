// Streams a public LiveATC ATIS feed through our edge so the browser <audio>
// element can play it without CORS / hotlink-protection headaches.
//
// Usage: <audio src="https://<proj>.functions.supabase.co/atc-atis-stream?icao=KSAN" />
//
// The function HEAD-probes the well-known LiveATC ATIS-only URL pattern
// (`https://d.liveatc.net/<icao>_atis`). If the feed is online (200 + audio
// content-type) we open a streaming GET, attach proper CORS + audio headers,
// and pipe the body through. If the feed is offline we return 404 so the
// client can fall back to TTS of the FAA D-ATIS text.
//
// Notes on compliance: LiveATC's ToS restricts redistribution. This proxy is
// intentionally a thin pass-through (1:1 user↔stream, no caching, no rebroadcast)
// so each pilot pull is the same as if their browser fetched directly.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

function liveAtcAtisCandidates(icao: string): string[] {
  const lo = icao.toLowerCase();
  const urls: string[] = [
    `https://d.liveatc.net/${lo}_atis`,
    `https://d.liveatc.net/${lo}2_atis`,
    `https://d.liveatc.net/${lo}_atis1`,
  ];
  if (/^K[A-Z]{3}$/.test(icao)) urls.push(`https://d.liveatc.net/${lo.slice(1)}_atis`);
  return urls;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const icao = (url.searchParams.get("icao") ?? "").toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(icao)) {
      return new Response(JSON.stringify({ error: "icao required (3–4 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward Range header when the browser asks (HTML5 audio often does).
    const fwdHeaders: Record<string, string> = {
      "User-Agent": "simpilot-atc/1.0 (+https://simpilot.ai)",
      Accept: "audio/mpeg, audio/*;q=0.9, */*;q=0.5",
      Referer: "https://www.liveatc.net/",
    };
    const range = req.headers.get("range");
    if (range) fwdHeaders["Range"] = range;

    // Try each known mount-name pattern; return the first one that streams audio.
    let upstreamResp: Response | null = null;
    let lastStatus = 0;
    for (const candidate of liveAtcAtisCandidates(icao)) {
      try {
        const r = await fetch(candidate, { method: "GET", headers: fwdHeaders, redirect: "follow" });
        lastStatus = r.status;
        if (!r.ok && r.status !== 206) { try { await r.body?.cancel(); } catch { /* noop */ } continue; }
        const ct = r.headers.get("content-type") ?? "";
        if (!/audio|mpeg|octet-stream/i.test(ct)) {
          try { await r.body?.cancel(); } catch { /* noop */ }
          continue;
        }
        upstreamResp = r;
        break;
      } catch {
        // try next candidate
      }
    }

    if (!upstreamResp || !upstreamResp.body) {
      return new Response(JSON.stringify({ error: "upstream unavailable", status: lastStatus }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ct = upstreamResp.headers.get("content-type") ?? "audio/mpeg";

    const respHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": ct,
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes",
    };
    const cl = upstreamResp.headers.get("content-length");
    if (cl) respHeaders["Content-Length"] = cl;
    const cr = upstreamResp.headers.get("content-range");
    if (cr) respHeaders["Content-Range"] = cr;

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
