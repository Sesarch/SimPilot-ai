// Generic admin-only access logger. Lets the frontend record "view"-style
// events into admin_audit_log without exposing direct INSERT to clients.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ACTIONS = new Set([
  "ai_orchestrator_test.view",
  "admin_panel.view",
  "admin_users.view",
  "admin_payments.view",
  "admin_kb.view",
  "admin_errors.view",
  "admin_audit.view",
  "admin_models.view",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData } = await supabase.auth.getUser(token);
  const user = userData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "Admin only" }, 403);

  let body: { action?: string; target_type?: string; target_id?: string; details?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (!body.action || !ALLOWED_ACTIONS.has(body.action)) {
    return json({ error: "Invalid action" }, 400);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;

  await supabase.from("admin_audit_log").insert({
    admin_user_id: user.id,
    admin_email: user.email ?? null,
    action: body.action,
    target_type: body.target_type ?? null,
    target_id: body.target_id ?? null,
    details: body.details ?? null,
    ip_address: ip,
    user_agent: req.headers.get("user-agent") ?? null,
  });

  return json({ ok: true });
});
