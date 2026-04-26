import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}
async function audit(client: any, req: Request, adminId: string, adminEmail: string | null, action: string, targetId: string, details: Record<string, unknown> = {}) {
  try {
    await client.from("admin_audit_log").insert({
      admin_user_id: adminId,
      admin_email: adminEmail,
      action,
      target_type: "user",
      target_id: targetId,
      details,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch (e) { console.error("audit fail", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST USERS
    if (req.method === "GET" && action === "list") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;

      // Get roles for all users
      const userIds = data.users.map((u: any) => u.id);
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Get profiles
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, terms_agreed_at")
        .in("user_id", userIds);

      // Engagement: last_transmission (latest chat session updated_at)
      const { data: sessions } = await adminClient
        .from("chat_sessions")
        .select("user_id, updated_at")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false });
      const lastTxByUser = new Map<string, string>();
      (sessions || []).forEach((s: any) => {
        if (!lastTxByUser.has(s.user_id)) lastTxByUser.set(s.user_id, s.updated_at);
      });

      // Total sim hours from flight_logs
      const { data: logs } = await adminClient
        .from("flight_logs")
        .select("user_id, total_time")
        .in("user_id", userIds);
      const simHoursByUser = new Map<string, number>();
      (logs || []).forEach((l: any) => {
        simHoursByUser.set(l.user_id, (simHoursByUser.get(l.user_id) || 0) + Number(l.total_time || 0));
      });

      // Active comp grants
      const { data: grants } = await adminClient
        .from("user_comp_grants")
        .select("user_id, plan_tier, expires_at")
        .in("user_id", userIds)
        .is("revoked_at", null);
      const grantByUser = new Map<string, { plan_tier: string; expires_at: string | null }>();
      (grants || []).forEach((g: any) => grantByUser.set(g.user_id, { plan_tier: g.plan_tier, expires_at: g.expires_at }));

      const enriched = data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: u.banned_until,
        is_banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        roles: (roles || []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
        display_name: (profiles || []).find((p: any) => p.user_id === u.id)?.display_name || null,
        terms_agreed_at: (profiles || []).find((p: any) => p.user_id === u.id)?.terms_agreed_at || null,
        last_transmission_at: lastTxByUser.get(u.id) || null,
        total_sim_hours: Number((simHoursByUser.get(u.id) || 0).toFixed(1)),
        comp_grant: grantByUser.get(u.id) || null,
      }));

      return new Response(JSON.stringify({ users: enriched, total: data.users.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "invite") {
        const { email } = body;
        if (!email || typeof email !== "string") {
          return new Response(JSON.stringify({ error: "Email is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, user: data.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "ban") {
        const { userId, duration } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Prevent self-ban
        if (userId === user.id) {
          return new Response(JSON.stringify({ error: "Cannot ban yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const banDuration = duration || "876000h"; // ~100 years = permanent
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: banDuration,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "unban") {
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete") {
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (userId === user.id) {
          return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "set-role") {
        const { userId, role } = body;
        if (!userId || !role) {
          return new Response(JSON.stringify({ error: "userId and role required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!["admin", "moderator", "user"].includes(role)) {
          return new Response(JSON.stringify({ error: "Invalid role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Clear existing roles and set new one
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        if (role !== "user") {
          const { error } = await adminClient
            .from("user_roles")
            .insert({ user_id: userId, role });
          if (error) throw error;
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
