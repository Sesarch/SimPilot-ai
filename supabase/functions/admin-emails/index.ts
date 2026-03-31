import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT and check admin role
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "stats";

    if (action === "stats") {
      // Get deduplicated stats
      const { data, error } = await serviceClient.rpc("execute_sql" as any, {}) as any;
      // Use direct query via from()
      const { data: logs, error: logError } = await serviceClient
        .from("email_send_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (logError) throw logError;

      // Deduplicate by message_id client-side
      const deduped = new Map<string, any>();
      for (const row of logs || []) {
        const key = row.message_id || row.id;
        if (!deduped.has(key) || new Date(row.created_at) > new Date(deduped.get(key).created_at)) {
          deduped.set(key, row);
        }
      }
      const uniqueEmails = Array.from(deduped.values());

      const stats = {
        total: uniqueEmails.length,
        sent: uniqueEmails.filter((e) => e.status === "sent").length,
        failed: uniqueEmails.filter((e) => e.status === "dlq" || e.status === "failed").length,
        pending: uniqueEmails.filter((e) => e.status === "pending").length,
        suppressed: uniqueEmails.filter((e) => e.status === "suppressed").length,
      };

      // Get distinct template names
      const templates = [...new Set(uniqueEmails.map((e) => e.template_name))].sort();

      return new Response(
        JSON.stringify({ stats, templates, emails: uniqueEmails }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
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
