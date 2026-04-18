// ATC voice synthesis via ElevenLabs.
// Returns raw MP3 bytes (audio/mpeg).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Calm, professional aviation-style voices.
const DEFAULT_VOICES: Record<string, string> = {
  male: "onwK4e9ZLuTAKqWW03F9", // Daniel — calm, broadcast
  female: "EXAVITQu4vr4xnSDxMaL", // Sarah — clear, professional
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text ?? "").toString().trim();
    const gender: "male" | "female" = body?.voice === "female" ? "female" : "male";
    const voiceId: string = body?.voiceId || DEFAULT_VOICES[gender];

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 1500) {
      return new Response(JSON.stringify({ error: "Text too long (max 1500 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.8,
            style: 0.15,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      },
    );

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => "");
      console.error("ElevenLabs TTS error", resp.status, errText);
      return new Response(JSON.stringify({ error: "TTS failed", status: resp.status, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("atc-tts error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
