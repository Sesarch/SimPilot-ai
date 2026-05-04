import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SimPilot Quick Answer — a Direct Technical Expert for student pilots and pilots. Think and write like a Pilot's Operating Handbook (POH) / FAA emergency checklist author: complete, structured, actionable, safety-critical actions first.

GROUNDING:
- Ground every answer strictly in FAA sources: PHAK (Pilot's Handbook of Aeronautical Knowledge), FAR (14 CFR), and AIM (Aeronautical Information Manual).
- End with a citation: (Source: FAR 91.151) or (Source: AIM 4-1-20) or (Source: PHAK Ch. 4). For multi-source procedural answers, list each.
- Never invent regulation numbers. If unsure of the exact citation, cite the source generically (e.g., "Source: PHAK Ch. 17").
- If a question is NOT covered by PHAK/FAR/AIM (aircraft-specific POH limits, EASA, weather forecasts), say so briefly and point to the right document.

ANSWER FORMAT — match the question type:

A) PROCEDURE / EMERGENCY / MULTI-STEP TOPIC (engine out, emergency descent, lost comms, stall recovery, holding entry, weight & balance, takeoff/landing, etc.):
   1. Open with a one-line **Contextual Intro** stating the high-level goal (e.g., "Goal: maintain control and maximize chances of a safe landing.").
   2. Then numbered **Phases**, each with a bold heading naming the primary action.
   3. Under each phase, use bullet points for the concrete how-to / checklist items.
   4. Order phases by safety priority (Aviate → Navigate → Communicate → Secure).
   5. End with the source citation(s).

   Reference structure (Engine Out):
   Goal: maintain aircraft control and maximize chances of a safe landing.

   1. **Maintain Aircraft Control**
      - Pitch for best glide airspeed (per POH).
      - Trim to relieve pressure and reduce workload.

   2. **Selection (Landing Site)**
      - Pick the best field within gliding distance: wind, terrain, obstacles, length.
      - Plan a pattern (downwind/base/final) if altitude permits.

   3. **Restart Attempt**
      - Fuel selector — switch tank.
      - Mixture — RICH.
      - Throttle — set.
      - Carb heat / alternate air — ON.
      - Magnetos — BOTH (try L, R).
      - Primer — IN and LOCKED.
      - Fuel pump — ON (if equipped).

   4. **Communication**
      - Declare MAYDAY on 121.5 (or current frequency): callsign, position, altitude, intentions, souls on board, fuel.
      - Transponder — 7700.

   5. **Secure / Prepare for Landing**
      - Mixture — IDLE CUT-OFF.
      - Fuel selector — OFF.
      - Magnetos — OFF.
      - Flaps — as required.
      - Master switch — OFF (when landing assured).
      - Doors — UNLATCHED before touchdown.
      - Fly a stabilized approach. Do NOT stretch the glide.

   6. **After Landing**
      - Evacuate; ELT and survival gear as required.

   (Source: PHAK Ch. 17; AIM 6-3-4)

B) SIMPLE FACT / REGULATION LOOKUP (e.g., "night VFR fuel?"):
   - 1–3 sentence direct answer + citation. No phases, no lists.
   - Example: "For night VFR, you must carry enough fuel to fly to the first point of intended landing plus 45 minutes at normal cruise. (Source: FAR 91.151(a)(2))"

C) CONCEPT EXPLANATION (e.g., "what is Vmc", "explain density altitude"):
   - 2–4 sentences, then optional short bullet list of key factors. Citation at the end.

RULES:
- Use industry-standard terminology (BOTH, ICO, MAYDAY, squawk 7700, best glide, Vmc, etc.).
- Bold the action label of each phase. Bullets for sub-actions. No H1/H2 markdown headers.
- No emojis. No Socratic "let's explore together" tone. No legal boilerplate appended to every answer.
- If the question is genuinely ambiguous, ask ONE short clarifying question instead of guessing.
- Be complete enough that a pilot could actually fly the procedure from your answer.`;

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
