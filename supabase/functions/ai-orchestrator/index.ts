// SimPilot Multi-Brain AI Orchestrator
// Routes requests to: Anthropic Claude (technical) | OpenAI GPT-4o (operational)
// | Google Gemini (vision) and enqueues Shadow Audit by OpenAI o1.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TaskType = "technical" | "operational" | "vision" | "auto";
type Msg = { role: "user" | "assistant" | "system"; content: any };

interface OrchestratorRequest {
  messages: Msg[];
  task?: TaskType;            // explicit override
  hint?: string;              // free-text hint to help auto-classify
  session_id?: string;
  message_id?: string;
  has_image?: boolean;
}

const SAFETY_BLOCK_NOTICE =
  "\n\n⚠️ **Safety Alert:** Information flagged for POH verification.";

function classify(req: OrchestratorRequest): Exclude<TaskType, "auto"> {
  if (req.task && req.task !== "auto") return req.task;
  if (req.has_image) return "vision";
  const last = req.messages[req.messages.length - 1];
  const text =
    typeof last?.content === "string"
      ? last.content
      : Array.isArray(last?.content)
      ? last.content.map((c: any) => c.text || "").join(" ")
      : "";
  const hay = (text + " " + (req.hint || "")).toLowerCase();
  if (/\b(ptt|push.?to.?talk|atc|tower|ground|clearance|wilco|roger|squawk|frequency)\b/.test(hay))
    return "operational";
  if (/\b(chart|approach plate|sectional|screenshot|image|photo|cockpit|panel)\b/.test(hay))
    return "vision";
  return "technical";
}

async function buildPilotContext(
  supabase: any,
  userId: string | null,
): Promise<{ block: string; raw: any }> {
  if (!userId) return { block: "", raw: null };
  const { data } = await supabase
    .from("profiles")
    .select(
      "display_name, certificate_type, license_level, aircraft_type, tail_number, region, rating_focus, flight_hours, training_progress",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { block: "", raw: null };
  const lines = [
    "## Unified Pilot Context (shared across all AI brains)",
    data.display_name && `Pilot: ${data.display_name}`,
    data.license_level && `License Level: ${data.license_level}`,
    data.certificate_type && `Certificate: ${data.certificate_type}`,
    data.aircraft_type && `Aircraft: ${data.aircraft_type}`,
    data.tail_number && `Tail Number: ${data.tail_number}`,
    data.region && `Region: ${data.region}`,
    data.rating_focus && `Rating Focus: ${data.rating_focus}`,
    data.flight_hours != null && `Flight Hours: ${data.flight_hours}`,
    data.training_progress &&
      Object.keys(data.training_progress || {}).length > 0 &&
      `Training Progress: ${JSON.stringify(data.training_progress)}`,
  ].filter(Boolean);
  return { block: lines.join("\n"), raw: data };
}

const SYSTEM_BASE = `You are SimPilot — a strict, safety-first Senior CFI. Use the Socratic method.
NEVER invent emergency procedures, V-speeds, or performance numbers. When uncertain, instruct the
pilot to consult the POH, the FAA, or a human CFI. Always end with a "📚 Sources" block citing
PHAK/AFH/IFH/AIM/FAR or the aircraft POH.`;

// ---------------- Adapters ----------------

async function callAnthropic(model: string, system: string, messages: Msg[]) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  // Anthropic expects user/assistant only; pull system out separately.
  const cleaned = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
          ? m.content
              .map((c: any) =>
                c.type === "text"
                  ? { type: "text", text: c.text }
                  : c.type === "image_url"
                  ? {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: "image/jpeg",
                        data: (c.image_url?.url || "").split(",")[1] || "",
                      },
                    }
                  : null,
              )
              .filter(Boolean)
          : "",
    }));

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 2048,
      messages: cleaned,
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const text = j.content?.map((c: any) => c.text).join("") || "";
  return text;
}

async function callOpenAI(model: string, system: string, messages: Msg[]) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function callLovableGateway(model: string, system: string, messages: Msg[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!r.ok) {
    if (r.status === 429) throw new Error("Rate limit on Lovable AI. Try again shortly.");
    if (r.status === 402) throw new Error("Lovable AI credits exhausted.");
    throw new Error(`Lovable Gateway ${r.status}: ${await r.text()}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

function dispatch(model: string, system: string, messages: Msg[]) {
  if (model.startsWith("anthropic/")) return callAnthropic(model.slice(10), system, messages);
  if (model.startsWith("openai/")) return callOpenAI(model.slice(7), system, messages);
  if (model.startsWith("google/")) return callLovableGateway(model, system, messages);
  // default through Lovable Gateway
  return callLovableGateway(model, system, messages);
}

// ---------------- Main handler ----------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as OrchestratorRequest;
    if (!body?.messages?.length)
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve user from JWT (best-effort; orchestrator works anonymously too)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // Load model settings
    const { data: settings } = await supabase
      .from("model_settings")
      .select("technical_model, operational_model, vision_model, auditor_model, shadow_audit_enabled, guardrails_enabled")
      .eq("id", 1)
      .maybeSingle();

    const cfg = settings || {
      technical_model: "anthropic/claude-3-5-sonnet-latest",
      operational_model: "openai/gpt-4o",
      vision_model: "google/gemini-2.5-pro",
      auditor_model: "openai/o1",
      shadow_audit_enabled: true,
      guardrails_enabled: true,
    };

    const task = classify(body);
    const model =
      task === "technical"
        ? cfg.technical_model
        : task === "operational"
        ? cfg.operational_model
        : cfg.vision_model;

    const { block: ctxBlock, raw: ctxRaw } = await buildPilotContext(supabase, userId);
    const system = [SYSTEM_BASE, ctxBlock, `Routed brain: ${task} (${model}).`]
      .filter(Boolean)
      .join("\n\n");

    const t0 = Date.now();
    const aiResponse = await dispatch(model, system, body.messages);
    const latency = Date.now() - t0;

    // Enqueue shadow audit (technical + operational only — vision skipped to save cost)
    let auditId: string | null = null;
    if (cfg.shadow_audit_enabled && task !== "vision") {
      const lastUser = body.messages
        .slice()
        .reverse()
        .find((m) => m.role === "user");
      const userPrompt =
        typeof lastUser?.content === "string"
          ? lastUser.content
          : Array.isArray(lastUser?.content)
          ? lastUser.content.map((c: any) => c.text || "").join(" ")
          : "";
      const { data: queued } = await supabase
        .from("ai_audit_queue")
        .insert({
          user_id: userId,
          session_id: body.session_id || null,
          message_id: body.message_id || null,
          task_type: task,
          primary_model: model,
          user_prompt: userPrompt,
          ai_response: aiResponse,
          pilot_context: ctxRaw,
        })
        .select("id")
        .single();
      auditId = queued?.id ?? null;
    }

    return new Response(
      JSON.stringify({
        task,
        model,
        latency_ms: latency,
        response: aiResponse,
        audit_id: auditId,
        safety_notice_template: SAFETY_BLOCK_NOTICE.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-orchestrator error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
