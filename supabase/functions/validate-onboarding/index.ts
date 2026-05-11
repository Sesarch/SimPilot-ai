import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Canonical SimPilot Stripe price IDs → plan key & label.
const PRICE_TO_PLAN: Record<string, { key: string; label: string }> = {
  price_1TNf5ZRusIXFsWjchdY05u0R: { key: "student", label: "Student" },
  price_1TQhYjRusIXFsWjc3wGvpiqS: { key: "pro", label: "Pro Pilot" },
  price_1TQhZBRusIXFsWjc2jrUeFEi: { key: "ultra", label: "Gold Seal CFI" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id } = await req.json().catch(() => ({}));
    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "subscription.items.data.price"],
    });

    // Ensure session belongs to this user.
    if (session.client_reference_id && session.client_reference_id !== user.id) {
      throw new Error("Session does not belong to current user");
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return new Response(
        JSON.stringify({ validated: false, reason: "Checkout not complete yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const sub = session.subscription as Stripe.Subscription | null;
    if (!sub || typeof sub === "string") {
      throw new Error("No subscription found on session");
    }
    const priceId = sub.items.data[0]?.price?.id ?? "";
    const mapped = PRICE_TO_PLAN[priceId];
    if (!mapped) {
      return new Response(
        JSON.stringify({
          validated: false,
          reason: `Subscription is not a SimPilot plan (${priceId})`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const periodEnd = sub.items.data[0]?.current_period_end ?? null;
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseAdmin
      .from("profiles")
      .update({
        selected_plan: mapped.key,
        subscription_tier: mapped.key,
        subscription_id: sub.id,
        subscription_status: sub.status,
        subscription_source: "stripe",
        subscription_current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        validated: true,
        plan_key: mapped.key,
        plan_label: mapped.label,
        subscription_status: sub.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[validate-onboarding] error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
