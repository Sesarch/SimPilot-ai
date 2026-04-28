import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  weather: "Aviation weather: METAR/TAF, fronts, icing, turbulence, thunderstorms, fog, winds, density altitude, weather services.",
  aerodynamics: "Aerodynamics & principles of flight: lift, drag, stalls, angle of attack, load factor, stability, ground effect, performance physics.",
  regulations: "FARs (14 CFR): currency, certificates, medicals, fuel requirements, equipment, operating rules.",
  airspace: "Airspace classes (A–G), special use airspace, TFRs, entry/equipment requirements, charts, transponder rules.",
  navigation: "VOR, GPS, pilotage, dead reckoning, charts, magnetic variation, NOTAMs, flight planning, E6B.",
  procedures: "Flight procedures: takeoffs, landings, traffic patterns, emergencies, runway markings, AIM operational procedures.",
  systems: "Aircraft systems: engines, electrical, fuel, hydraulics, pitot-static, gyroscopic instruments.",
  communications: "ATC communications, phraseology, light gun signals, radio failure procedures.",
  performance: "Aircraft performance & weight and balance: takeoff/landing distance, CG, charts, density altitude effects.",
  human_factors: "Aeromedical & human factors: hypoxia, spatial disorientation, fatigue, ADM, CRM, illusions.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, section } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (typeof question !== "string" || !question.trim()) {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const desc = SECTION_DESCRIPTIONS[section];
    if (!desc) {
      // Unknown section → treat as relevant (no narrowing)
      return new Response(JSON.stringify({ relevant: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You classify whether a pilot's question belongs to a specific FAA training section.
Section: "${section}"
Section scope: ${desc}

Return relevant=true ONLY if the question clearly falls within this section's scope.
Return relevant=false if it's about a different aviation topic.
Be strict but not pedantic — borderline questions that touch the section count as relevant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_section",
              description: "Classify if the question fits the section scope.",
              parameters: {
                type: "object",
                properties: {
                  relevant: { type: "boolean" },
                  reason: { type: "string", description: "Short reason (max 1 sentence)." },
                },
                required: ["relevant", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_section" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("section-check gateway error:", response.status, t);
      // Fail open — don't block the user
      return new Response(JSON.stringify({ relevant: true, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: { relevant: boolean; reason: string } = { relevant: true, reason: "" };
    if (typeof args === "string") {
      try { parsed = JSON.parse(args); } catch { /* keep default */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("section-check error:", e);
    return new Response(JSON.stringify({ relevant: true, fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
