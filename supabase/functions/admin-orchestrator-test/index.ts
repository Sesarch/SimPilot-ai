// Admin-only proxy that wraps ai-orchestrator and writes an admin_audit_log
// row for every test run attempt (success or failure).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  const logAttempt = async (
    adminUserId: string | null,
    adminEmail: string | null,
    action: string,
    details: Record<string, unknown>,
  ) => {
    try {
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        action,
        target_type: "ai_orchestrator",
        target_id: null,
        details,
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch (e) {
      console.error("admin_audit_log insert failed", e);
    }
  };

  // ---- AuthN
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    await logAttempt(null, null, "ai_orchestrator_test.denied", { reason: "missing_auth" });
    return json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  const { data: userData } = await supabase.auth.getUser(token);
  const user = userData.user;
  if (!user) {
    await logAttempt(null, null, "ai_orchestrator_test.denied", { reason: "invalid_token" });
    return json({ error: "Unauthorized" }, 401);
  }

  // ---- AuthZ
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    await logAttempt(user.id, user.email ?? null, "ai_orchestrator_test.denied", {
      reason: "not_admin",
    });
    return json({ error: "Admin only" }, 403);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    await logAttempt(user.id, user.email ?? null, "ai_orchestrator_test.denied", {
      reason: "invalid_json",
    });
    return json({ error: "Invalid JSON" }, 400);
  }

  const lastUser = Array.isArray(body?.messages)
    ? body.messages.slice().reverse().find((m: any) => m.role === "user")
    : null;
  const promptPreview =
    typeof lastUser?.content === "string" ? lastUser.content.slice(0, 500) : "[non-text]";

  // ---- Forward to ai-orchestrator
  const t0 = Date.now();
  let upstreamStatus = 0;
  let upstreamJson: any = null;
  let upstreamError: string | null = null;

  try {
    const r = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-orchestrator`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // preserve user identity for pilot context
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    upstreamStatus = r.status;
    const text = await r.text();
    try {
      upstreamJson = JSON.parse(text);
    } catch {
      upstreamJson = { raw: text.slice(0, 500) };
    }
    if (!r.ok) upstreamError = upstreamJson?.error || `HTTP ${r.status}`;
  } catch (e) {
    upstreamError = e instanceof Error ? e.message : String(e);
  }

  const latency = Date.now() - t0;
  const action = upstreamError
    ? "ai_orchestrator_test.failure"
    : "ai_orchestrator_test.success";

  await logAttempt(user.id, user.email ?? null, action, {
    forced_task: body?.task ?? "auto",
    routed_task: upstreamJson?.task ?? null,
    model: upstreamJson?.model ?? null,
    latency_ms: latency,
    upstream_status: upstreamStatus,
    audit_id: upstreamJson?.audit_id ?? null,
    prompt_preview: promptPreview,
    error: upstreamError,
  });

  if (upstreamError) {
    return json({ error: upstreamError, status: upstreamStatus }, 502);
  }

  return json(upstreamJson);
});
