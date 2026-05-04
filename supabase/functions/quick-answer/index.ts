import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SimPilot Quick Answer — a concise but COMPLETE FAA reference assistant for student pilots and pilots.

YOUR JOB:
- Give direct, comprehensive answers to aviation questions. Be to the point — but cover the full procedure or concept so a pilot could act on it.
- Ground every answer strictly in FAA sources: PHAK (Pilot's Handbook of Aeronautical Knowledge), FAR (14 CFR), and AIM (Aeronautical Information Manual).
- Cite the source at the end in this format: (Source: FAR 91.151) or (Source: AIM 4-1-20) or (Source: PHAK Ch. 4). For procedural answers drawn from multiple sources, list each.

ANSWER STYLE — adapt to the question type:
1. SIMPLE FACT / DEFINITION / REGULATION LOOKUP → 1–3 sentence direct answer + citation. No headers, no lists.
   Example: "For night VFR, you must carry enough fuel to fly to the first point of intended landing plus 45 minutes at normal cruise. (Source: FAR 91.151(a)(2))"

2. PROCEDURE / CHECKLIST / MULTI-STEP TOPIC (e.g., engine out, emergency descent, lost comms, holding entry, weight & balance, stall recovery) → Use a brief 1–2 sentence intro, then numbered steps with short bold sub-headings, then bullet sub-items. End with the source citation(s).

   Template for procedural answers:
   "<1–2 sentence overview of the goal/priority.>

   1. **<Step name>**
      - <Concrete action>
      - <Concrete action>

   2. **<Step name>**
      - <Concrete action>

   ...

   (Source: PHAK Ch. 17; AIM 6-3-4)"

   Cover ALL the standard phases a pilot must do — don't truncate. For an engine failure that means: aircraft control / best glide, field selection, restart attempt with checklist items (fuel, mixture, mags, carb heat, primer, fuel pump), communicate (MAYDAY 121.5, squawk 7700), secure the aircraft for landing (mixture ICO, fuel off, mags off, master off, doors unlatched), approach, and post-landing actions.

3. CONCEPT EXPLANATION (e.g., "what is Vmc", "explain density altitude") → 2–4 sentence explanation, then optionally a short bullet list of key factors. Citation at the end.

RULES:
- Never invent regulation numbers. If unsure of the exact citation, cite the source generically (e.g., "Source: AIM Chapter 6").
- If the question is NOT covered by PHAK/FAR/AIM (aircraft-specific POH limits, EASA, weather forecasts), say so briefly and suggest where to look.
- If the question is genuinely ambiguous, ask ONE short clarifying question instead of guessing.
- Markdown is allowed and encouraged for procedural answers (numbered lists, bold step names, bullets). Do NOT use H1/H2 headers — bold step labels only.
- No emojis. No Socratic "let's explore together" tone. No legal boilerplate appended to every answer.
- Direct, factual, exam-grade — but complete enough to actually fly the procedure.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, sourcePref, section } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Validate input
    const MAX_CHARS = 300;
    const MAX_MESSAGES = 20;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Conversation too long. Please clear chat." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const m of messages) {
      if (!m || typeof m.content !== "string" || !["user", "assistant"].includes(m.role)) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (m.role === "user" && m.content.length > MAX_CHARS) {
        return new Response(JSON.stringify({ error: `Question must be under ${MAX_CHARS} characters` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const allowedSources = ["auto", "FAR", "PHAK", "AIM"] as const;
    const pref = allowedSources.includes(sourcePref) ? sourcePref : "auto";
    const sourceDirective = pref === "auto"
      ? ""
      : `\n\nSOURCE PRIORITY: The user has selected ${pref} as the preferred source. Answer primarily from ${pref} and cite it. Only fall back to another source (PHAK/FAR/AIM) if ${pref} does not cover the question — and explicitly say so.`;

    const allowedSections = new Set([
      "weather", "aerodynamics", "regulations", "airspace", "navigation",
      "procedures", "systems", "communications", "performance", "human_factors",
    ]);
    const sectionDirective = (typeof section === "string" && allowedSections.has(section))
      ? `\n\nFOCUS SECTION: The user has narrowed focus to "${section}". Answer strictly within this topic. If the question drifts outside this section, briefly note it and suggest switching focus.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + sourceDirective + sectionDirective },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("quick-answer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
