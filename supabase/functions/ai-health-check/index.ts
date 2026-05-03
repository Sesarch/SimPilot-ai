// SimPilot AI Model Health Check
// Pings each configured brain (Anthropic, OpenAI, Lovable Gateway) with a tiny prompt
// and reports reachability + decoded error explanations.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Result = {
  brain: string;
  model: string;
  provider: "anthropic" | "openai" | "lovable";
  ok: boolean;
  status: number | null;
  latency_ms: number;
  error?: string;
  hint?: string;
};

function explain(provider: string, status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403)
    return "Authentication failed. The API key is missing, invalid, or revoked. Re-add the secret.";
  if (status === 404) {
    if (provider === "anthropic")
      return "Model not found on this Anthropic account. Enable model access in console.anthropic.com → Settings → Models, or pick another Claude variant.";
    if (provider === "openai")
      return "Model not found on this OpenAI key. The key may not have access to this specific model (e.g. gpt-4o, o1). Verify access in platform.openai.com.";
    return "Model identifier not recognised by the gateway. Pick a different model.";
  }
  if (status === 429) {
    if (lower.includes("insufficient_quota"))
      return "OpenAI: insufficient_quota. Add credits at platform.openai.com → Billing.";
    if (provider === "lovable")
      return "Lovable AI rate limit. Wait a moment or top up credits in Workspace → Usage.";
    return "Rate limited. Wait a moment, then retry. If persistent, check provider quota.";
  }
  if (status === 402) return "Payment required — provider credits exhausted.";
  if (status >= 500) return "Provider is having a temporary outage. Retry shortly.";
  return body.slice(0, 200);
}

async function pingAnthropic(model: string): Promise<Result> {
  const t0 = Date.now();
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey)
    return { brain: "", model, provider: "anthropic", ok: false, status: null, latency_ms: 0,
      error: "ANTHROPIC_API_KEY secret is not set.", hint: "Add the secret in Lovable Cloud." };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "ping" }] }),
    });
    const text = await r.text();
    return {
      brain: "", model, provider: "anthropic", ok: r.ok,
      status: r.status, latency_ms: Date.now() - t0,
      error: r.ok ? undefined : text.slice(0, 300),
      hint: r.ok ? undefined : explain("anthropic", r.status, text),
    };
  } catch (e) {
    return { brain: "", model, provider: "anthropic", ok: false, status: null,
      latency_ms: Date.now() - t0, error: String(e), hint: "Network error reaching Anthropic." };
  }
}

async function pingOpenAI(model: string): Promise<Result> {
  const t0 = Date.now();
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey)
    return { brain: "", model, provider: "openai", ok: false, status: null, latency_ms: 0,
      error: "OPENAI_API_KEY secret is not set.", hint: "Add the secret in Lovable Cloud." };
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "ping" }] }),
    });
    const text = await r.text();
    return {
      brain: "", model, provider: "openai", ok: r.ok,
      status: r.status, latency_ms: Date.now() - t0,
      error: r.ok ? undefined : text.slice(0, 300),
      hint: r.ok ? undefined : explain("openai", r.status, text),
    };
  } catch (e) {
    return { brain: "", model, provider: "openai", ok: false, status: null,
      latency_ms: Date.now() - t0, error: String(e), hint: "Network error reaching OpenAI." };
  }
}

async function pingLovable(model: string): Promise<Result> {
  const t0 = Date.now();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey)
    return { brain: "", model, provider: "lovable", ok: false, status: null, latency_ms: 0,
      error: "LOVABLE_API_KEY missing.", hint: "Re-enable Lovable Cloud / AI Gateway." };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }] }),
    });
    const text = await r.text();
    return {
      brain: "", model, provider: "lovable", ok: r.ok,
      status: r.status, latency_ms: Date.now() - t0,
      error: r.ok ? undefined : text.slice(0, 300),
      hint: r.ok ? undefined : explain("lovable", r.status, text),
    };
  } catch (e) {
    return { brain: "", model, provider: "lovable", ok: false, status: null,
      latency_ms: Date.now() - t0, error: String(e), hint: "Network error reaching Lovable Gateway." };
  }
}

function ping(model: string): Promise<Result> {
  if (model.startsWith("anthropic/")) return pingAnthropic(model.slice(10));
  if (model.startsWith("openai/")) {
    // Direct OpenAI for openai/gpt-4o, openai/o1 etc; gateway models also start openai/
    // Convention: gateway entries we route to Lovable are gpt-5*; direct are gpt-4o, gpt-4o-mini, o1, o1-mini
    const id = model.slice(7);
    if (/^(gpt-4o|o1)/.test(id)) return pingOpenAI(id);
    return pingLovable(model);
  }
  if (model.startsWith("google/")) return pingLovable(model);
  return pingLovable(model);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // admin gate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: userData } = await supabase.auth.getUser(authHeader.slice(7));
    const userId = userData.user?.id;
    if (!userId)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow)
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: settings } = await supabase
      .from("model_settings")
      .select("technical_model, operational_model, vision_model, auditor_model")
      .eq("id", 1).maybeSingle();

    const cfg = settings || {
      technical_model: "anthropic/claude-3-5-sonnet-latest",
      operational_model: "openai/gpt-4o",
      vision_model: "google/gemini-2.5-pro",
      auditor_model: "openai/o1",
    };

    const targets: { brain: string; model: string }[] = [
      { brain: "Technical", model: cfg.technical_model },
      { brain: "Operational", model: cfg.operational_model },
      { brain: "Vision", model: cfg.vision_model },
      { brain: "Auditor", model: cfg.auditor_model },
    ];

    const results = await Promise.all(
      targets.map(async (t) => ({ ...(await ping(t.model)), brain: t.brain, model: t.model })),
    );

    return new Response(JSON.stringify({ checked_at: new Date().toISOString(), results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
