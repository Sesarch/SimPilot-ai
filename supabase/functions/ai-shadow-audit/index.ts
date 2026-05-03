// SimPilot Shadow Audit Worker
// Drains ai_audit_queue. Sends each pending row to the Auditor brain (OpenAI o1 by default)
// with POH/PHAK context and asks for a structured contradiction report.
// Severity 1 hits write to ai_safety_flags; the original row is marked 'flagged'.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH = 8;

const AUDITOR_PROMPT = `You are the SimPilot Safety Auditor. Compare the AI Response to FAA standards
(PHAK / AFH / IFH / AIM / FAR Part 91) and standard POH practice for the pilot's aircraft.

Identify Severity 1 contradictions ONLY:
- Invented or wrong V-speeds, performance numbers, weight & balance
- Invented or wrong emergency procedures
- Direct violations of regulations
- Anything that could cause unsafe flight if a student trusted it

Return STRICT JSON, no prose:
{
  "severity": 0 | 1,
  "category": "poh_contradiction" | "reg_violation" | "emergency_proc" | "performance_data" | "none",
  "contradiction": "short description, empty string if severity 0",
  "poh_reference": "doc name + section, or empty string"
}`;

async function callAuditor(model: string, userPrompt: string, aiResponse: string, ctx: any) {
  const payload = {
    pilot_context: ctx || {},
    user_prompt: userPrompt,
    ai_response: aiResponse,
  };

  if (model.startsWith("openai/")) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: model.slice(7),
        messages: [
          { role: "system", content: AUDITOR_PROMPT },
          { role: "user", content: JSON.stringify(payload) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`Auditor (OpenAI) ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content || "{}";
  }

  if (model.startsWith("anthropic/")) {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model.slice(10),
        system: AUDITOR_PROMPT + "\nRespond with raw JSON only.",
        max_tokens: 800,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
    if (!r.ok) throw new Error(`Auditor (Anthropic) ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.content?.map((c: any) => c.text).join("") || "{}";
  }

  // fall back: Lovable Gateway
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: AUDITOR_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`Auditor (Lovable) ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "{}";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: settings } = await supabase
    .from("model_settings")
    .select("auditor_model, shadow_audit_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (!settings?.shadow_audit_enabled) {
    return new Response(JSON.stringify({ skipped: "audit disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const auditorModel = settings.auditor_model || "openai/o1";

  // claim a batch
  const { data: pending } = await supabase
    .from("ai_audit_queue")
    .select("*")
    .eq("status", "pending")
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  const rows = pending || [];
  let processed = 0,
    flagged = 0,
    errors = 0;

  for (const row of rows) {
    await supabase
      .from("ai_audit_queue")
      .update({
        status: "reviewing",
        audit_started_at: new Date().toISOString(),
        attempts: (row.attempts || 0) + 1,
        audit_model: auditorModel,
      })
      .eq("id", row.id);

    try {
      const raw = await callAuditor(
        auditorModel,
        row.user_prompt,
        row.ai_response,
        row.pilot_context,
      );
      let verdict: any = {};
      try {
        verdict = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        verdict = m ? JSON.parse(m[0]) : {};
      }
      const sev = Number(verdict.severity || 0);
      if (sev >= 1) {
        flagged++;
        await supabase.from("ai_safety_flags").insert({
          audit_queue_id: row.id,
          user_id: row.user_id,
          session_id: row.session_id,
          message_id: row.message_id,
          severity: 1,
          category: verdict.category || "poh_contradiction",
          contradiction: verdict.contradiction || "Auditor flagged a contradiction.",
          poh_reference: verdict.poh_reference || null,
          auditor_model: auditorModel,
        });
        await supabase
          .from("ai_audit_queue")
          .update({
            status: "flagged",
            audit_completed_at: new Date().toISOString(),
            audit_notes: verdict.contradiction || null,
          })
          .eq("id", row.id);
      } else {
        await supabase
          .from("ai_audit_queue")
          .update({
            status: "clean",
            audit_completed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      processed++;
    } catch (e) {
      errors++;
      console.error("audit error", row.id, e);
      await supabase
        .from("ai_audit_queue")
        .update({
          status: (row.attempts || 0) + 1 >= 3 ? "error" : "pending",
          audit_notes: e instanceof Error ? e.message : String(e),
        })
        .eq("id", row.id);
    }
  }

  return new Response(
    JSON.stringify({ processed, flagged, errors, batch: rows.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
