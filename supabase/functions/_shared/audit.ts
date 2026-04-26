// Shared audit-log helper for Super Admin edge functions.
// Inserts a row into admin_audit_log using the service role.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export async function logAdminAction(
  admin: SupabaseClient,
  opts: {
    adminUserId: string;
    adminEmail: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    req: Request;
  },
) {
  try {
    await admin.from("admin_audit_log").insert({
      admin_user_id: opts.adminUserId,
      admin_email: opts.adminEmail,
      action: opts.action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      details: opts.details ?? null,
      ip_address: getClientIp(opts.req),
      user_agent: opts.req.headers.get("user-agent") ?? null,
    });
  } catch (e) {
    console.error("[audit] failed to log:", e);
  }
}

export async function requireAdmin(req: Request): Promise<{
  user: { id: string; email: string | null };
  admin: SupabaseClient;
} | Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) {
    return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { user: { id: user.id, email: user.email ?? null }, admin };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
