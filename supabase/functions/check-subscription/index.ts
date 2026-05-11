import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_TIER: Record<string, "pro" | "ultra"> = {
  price_1TQhYjRusIXFsWjc3wGvpiqS: "pro",
  price_1TQhZBRusIXFsWjc2jrUeFEi: "ultra",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr) throw userErr;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false, tier: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Pull a few subs so we can also surface trialing / past_due / canceled-at-period-end.
    const subs = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "all",
      limit: 5,
    });

    const sub = subs.data
      .filter((s) => ["active", "trialing", "past_due", "unpaid"].includes(s.status))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

    if (!sub) {
      return new Response(JSON.stringify({ subscribed: false, tier: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const item = sub.items.data[0];
    const price = item?.price;
    const priceId = price?.id;
    const tier = priceId ? PRICE_TO_TIER[priceId] ?? null : null;
    // deno-lint-ignore no-explicit-any
    const periodEndUnix: number | undefined = (sub as any).current_period_end ?? (item as any)?.current_period_end;

    return new Response(
      JSON.stringify({
        subscribed: ["active", "trialing"].includes(sub.status),
        status: sub.status,
        tier,
        price_id: priceId ?? null,
        amount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
        interval_count: price?.recurring?.interval_count ?? null,
        cancel_at_period_end: sub.cancel_at_period_end,
        subscription_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[check-subscription]", msg);
    return new Response(JSON.stringify({ subscribed: false, error: msg }), {
      status: 200, // never 500 — frontend just treats as unsubscribed
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
