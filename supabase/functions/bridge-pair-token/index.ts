// SimPilot Bridge — One-Time Pairing Token Issuer
// ---------------------------------------------------------------------------
// The /flight-deck/bridge "Pair Bridge" button calls this function to mint a
// short-lived JWT bound to the signed-in user's id. The web app then opens
//   simpilot://pair?token=<JWT>
// which the desktop tray app receives via its registered protocol handler.
//
// The bridge sidecar verifies this same JWT on its localhost WebSocket so
// pairing requires nothing more than a click in the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the calling user via the anon client + their access token.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mint a short-lived HS256 token. The signing secret is shared with the
    // bridge sidecar (set BRIDGE_PAIRING_SECRET in both edge function secrets
    // and the bridge's .env) so the bridge can verify it offline.
    const secret = Deno.env.get("BRIDGE_PAIRING_SECRET");
    if (!secret) {
      return new Response(JSON.stringify({ error: "BRIDGE_PAIRING_SECRET not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const ttlSeconds = 5 * 60; // 5 minutes
    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: userData.user.id,
        email: userData.user.email,
        scope: "bridge:pair",
        iat: getNumericDate(0),
        exp: getNumericDate(ttlSeconds),
      },
      key
    );

    return new Response(
      JSON.stringify({
        token: jwt,
        expires_in: ttlSeconds,
        deep_link: `simpilot://pair?token=${encodeURIComponent(jwt)}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
