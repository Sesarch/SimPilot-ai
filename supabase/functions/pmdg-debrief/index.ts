// Generates an airline-style post-flight debrief for PMDG flights.
// Takes a flight summary + a slim PMDG event timeline and asks Lovable AI
// to produce structured feedback on automation discipline, flap-speed gates,
// and stable-approach criteria. The result is persisted on flight_logs.pmdg_debrief.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PmdgEvent = {
  t: number;
  t_rel?: number;
  label: string;
  kind: "ap" | "at" | "flaps" | "mcp_alt" | "mcp_hdg" | "mcp_ias";
  alt?: number;
  spd?: number;
  ground_speed?: number;
  on_ground?: boolean;
  value?: number | string | boolean;
};

interface RequestBody {
  flight_log_id: string;
  variant?: string;
  aircraft_title?: string;
  duration_minutes?: number;
  departure?: string | null;
  destination?: string | null;
  events: PmdgEvent[];
}

const SYSTEM_PROMPT = `You are a senior B737 line-check airman writing a concise, airline-style post-flight debrief.
You receive: aircraft variant, flight duration, departure/destination, and a chronological PMDG event timeline
with autopilot, autothrottle, MCP altitude changes, and flap handle moves — each with the airspeed (kt IAS) and
altitude (ft) at the moment it happened.

Evaluate the pilot against these standards:

AUTOMATION DISCIPLINE
- A/P should be engaged at or above 1000 ft AGL on departure (≈1500 ft MSL near sea level).
- A/T should be engaged for departure climb and remain engaged through approach to ~50 ft AGL on landing.
- Excessive A/P engage/disengage cycles below 5000 ft suggests instability — flag if >2.

FLAP SPEED SCHEDULE (B737 placards, kt IAS):
- Flaps 1: ≤ 250 (max maneuvering ~230)
- Flaps 5: ≤ 250
- Flaps 10: ≤ 210
- Flaps 15: ≤ 200
- Flaps 25: ≤ 190
- Flaps 30: ≤ 175
- Flaps 40: ≤ 162
For each flap extension, check the IAS at the event. Flag any extension >5 kt over the placard as an exceedance.

STABLE APPROACH (737 SOP)
- By 1000 ft AGL the aircraft should be: in landing configuration (Flaps 30 or 40), on speed (Vref + 5 nominal),
  on profile, with A/T engaged. If the final flap setting was selected below 1000 ft or A/T was off, flag it.

MCP ALTITUDE BUSTS
- Look for cases where airspeed/altitude trend at an MCP_ALT event suggests crossing the selected altitude.
  Treat as advisory — don't over-call without strong evidence.

Be specific, professional, terse. Cite event timestamps (mm:ss from start) when calling things out.
Praise good airmanship when present. Score 0-100 across three axes.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_pmdg_debrief",
    description: "Return the structured airline-style PMDG debrief.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "2-4 sentence executive summary of the flight from a check airman's perspective.",
        },
        scores: {
          type: "object",
          properties: {
            automation: { type: "integer", minimum: 0, maximum: 100 },
            flap_schedule: { type: "integer", minimum: 0, maximum: 100 },
            stable_approach: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: ["automation", "flap_schedule", "stable_approach"],
          additionalProperties: false,
        },
        automation: {
          type: "object",
          properties: {
            ap_engagement_call: { type: "string" },
            at_usage_call: { type: "string" },
            engage_disengage_count: { type: "integer" },
            issues: { type: "array", items: { type: "string" } },
          },
          required: ["ap_engagement_call", "at_usage_call", "issues"],
          additionalProperties: false,
        },
        flap_schedule: {
          type: "object",
          properties: {
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  flap_setting: { type: "integer" },
                  ias_kt: { type: "integer" },
                  placard_kt: { type: "integer" },
                  exceedance_kt: { type: "integer" },
                  time_mmss: { type: "string" },
                  verdict: { type: "string", enum: ["ok", "marginal", "exceedance"] },
                  note: { type: "string" },
                },
                required: ["flap_setting", "ias_kt", "verdict"],
                additionalProperties: false,
              },
            },
          },
          required: ["findings"],
          additionalProperties: false,
        },
        stable_approach: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["stable", "marginal", "unstable", "unknown"] },
            note: { type: "string" },
          },
          required: ["verdict", "note"],
          additionalProperties: false,
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific, actionable improvements for the next leg.",
        },
      },
      required: [
        "summary",
        "scores",
        "automation",
        "flap_schedule",
        "stable_approach",
        "recommendations",
      ],
      additionalProperties: false,
    },
  },
} as const;

function fmtMmss(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) return "??:??";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildUserPrompt(body: RequestBody) {
  const lines: string[] = [];
  lines.push(`Aircraft: ${body.variant ?? "PMDG"} (${body.aircraft_title ?? "unknown title"})`);
  lines.push(
    `Route: ${body.departure ?? "????"} → ${body.destination ?? "????"} · Duration: ${
      body.duration_minutes != null ? `${body.duration_minutes.toFixed(1)} min` : "unknown"
    }`,
  );
  lines.push("");
  lines.push("PMDG event timeline (mm:ss · IAS kt · ALT ft · event):");
  for (const e of body.events) {
    const valuePart =
      e.kind === "flaps"
        ? `flap handle = ${e.value}`
        : e.kind === "ap" || e.kind === "at"
          ? e.label
          : e.kind === "mcp_alt"
            ? `MCP ALT = ${e.value}`
            : e.label;
    lines.push(
      `  ${fmtMmss(e.t_rel)} · ${e.spd != null ? `${Math.round(e.spd)} kt` : "?"} · ${
        e.alt != null ? `${Math.round(e.alt)} ft` : "?"
      } · ${valuePart}`,
    );
  }
  lines.push("");
  lines.push(
    "Produce the structured debrief by calling the submit_pmdg_debrief tool. Be specific, cite times, do not invent events not in the timeline.",
  );
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RLS-scoped client (acts as the calling pilot for the row update)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.flight_log_id || !Array.isArray(body.events)) {
      return new Response(
        JSON.stringify({ error: "flight_log_id and events[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.events.length === 0) {
      return new Response(
        JSON.stringify({ error: "No PMDG events captured — nothing to debrief." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirm the flight log belongs to this user (defence-in-depth; RLS already enforces)
    const { data: log, error: logErr } = await supabase
      .from("flight_logs")
      .select("id, user_id")
      .eq("id", body.flight_log_id)
      .maybeSingle();
    if (logErr || !log || log.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Flight log not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = buildUserPrompt(body);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_pmdg_debrief" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit on the AI gateway. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Add funds in Lovable Cloud → Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await aiResp.text();
      console.error("[pmdg-debrief] AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[pmdg-debrief] No tool call in response", aiJson);
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("[pmdg-debrief] Failed to parse tool args", e);
      return new Response(JSON.stringify({ error: "Malformed AI output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const debrief = {
      generated_at: new Date().toISOString(),
      variant: body.variant ?? null,
      aircraft_title: body.aircraft_title ?? null,
      duration_minutes: body.duration_minutes ?? null,
      departure: body.departure ?? null,
      destination: body.destination ?? null,
      ...parsed,
      event_timeline: body.events,
    };

    const { error: updErr } = await supabase
      .from("flight_logs")
      .update({ pmdg_debrief: debrief })
      .eq("id", body.flight_log_id);

    if (updErr) {
      console.error("[pmdg-debrief] Failed to persist debrief", updErr);
      return new Response(JSON.stringify({ error: "Failed to save debrief" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ debrief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[pmdg-debrief] unexpected error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
