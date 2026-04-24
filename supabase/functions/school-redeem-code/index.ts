import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Authentication required");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Invalid session");
    const userId = userData.user.id;

    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) throw new Error("Code required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Lookup the code
    const { data: codeRow, error: cErr } = await admin
      .from("school_seat_codes")
      .select("id, purchase_id, redeemed_by_user_id")
      .eq("code", code)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!codeRow) throw new Error("Code not found");
    if (codeRow.redeemed_by_user_id) {
      if (codeRow.redeemed_by_user_id === userId) {
        return new Response(JSON.stringify({ status: "already_yours" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Code already redeemed");
    }

    // Check the purchase
    const { data: purchase, error: pErr } = await admin
      .from("school_purchases")
      .select("status, expires_at, school_name")
      .eq("id", codeRow.purchase_id)
      .single();
    if (pErr) throw pErr;
    if (purchase.status !== "paid") throw new Error("Purchase not active");
    if (new Date(purchase.expires_at) < new Date()) throw new Error("Code expired");

    // Make sure user doesn't already have an active school code
    const { data: existing } = await admin
      .from("profiles")
      .select("school_seat_code_id, subscription_expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.school_seat_code_id && existing.subscription_expires_at && new Date(existing.subscription_expires_at) > new Date()) {
      throw new Error("You already have an active school subscription");
    }

    // Atomic-ish redemption (single row update guarded by null redeemed_by)
    const { data: updated, error: rErr } = await admin
      .from("school_seat_codes")
      .update({ redeemed_by_user_id: userId, redeemed_at: new Date().toISOString() })
      .eq("id", codeRow.id)
      .is("redeemed_by_user_id", null)
      .select("id")
      .maybeSingle();
    if (rErr) throw rErr;
    if (!updated) throw new Error("Code was just redeemed by someone else");

    // Apply subscription to profile
    await admin
      .from("profiles")
      .update({
        school_seat_code_id: codeRow.id,
        subscription_expires_at: purchase.expires_at,
        subscription_source: "school",
      })
      .eq("user_id", userId);

    return new Response(JSON.stringify({
      status: "redeemed",
      school_name: purchase.school_name,
      expires_at: purchase.expires_at,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("school-redeem-code error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
