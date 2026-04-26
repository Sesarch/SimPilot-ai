// Returns top-N relevant chunks for a query string. Used internally by
// pilot-chat (server-to-server) and can also be called from the admin UI
// to test retrieval.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { embedText, toPgVector } from "../_shared/kb-embed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, top_k = 6, threshold = 0.05 } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const vec = embedText(query);
    const { data, error } = await sb.rpc("match_kb_chunks", {
      query_embedding: toPgVector(vec) as unknown as number[],
      match_count: Math.min(Math.max(Number(top_k) || 6, 1), 20),
      similarity_threshold: Number(threshold) || 0,
    });

    if (error) {
      console.error("match_kb_chunks error:", error);
      return new Response(JSON.stringify({ error: error.message, matches: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ matches: data || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-search error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message, matches: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
