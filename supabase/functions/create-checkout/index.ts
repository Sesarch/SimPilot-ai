import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_IDS: Record<string, string> = {
  student: "price_1TNf5ZRusIXFsWjchdY05u0R", // SimPilot Student $29/mo
  pro: "price_1TQhYjRusIXFsWjc3wGvpiqS",     // SimPilot Pro $59/mo
  ultra: "price_1TQhZBRusIXFsWjc2jrUeFEi",   // SimPilot Ultra $99/mo
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan, price_id } = await req.json().catch(() => ({}));
    const resolvedPrice = price_id || (plan ? PRICE_IDS[plan] : null);
    if (!resolvedPrice) {
      return new Response(JSON.stringify({ error: "Missing 'plan' or 'price_id'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Allowlist of origins we will redirect back to. Anything else falls back
    // to the canonical production dashboard so users are never sent elsewhere
    // (e.g. link.com or an unknown host) after a successful payment.
    const ALLOWED_ORIGINS = [
      "https://simpilot.ai",
      "https://www.simpilot.ai",
      "https://soar-ai-guide.lovable.app",
    ];
    const rawOrigin = req.headers.get("origin") ?? "";
    const isLovablePreview = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(rawOrigin);
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) || isLovablePreview
      ? rawOrigin
      : "https://simpilot.ai";
    const planParam = encodeURIComponent(plan ?? "custom");
    const priceParam = encodeURIComponent(resolvedPrice);
    // Encode plan + price + session id into the redirect URLs so the landing
    // page can recover the selected plan after a refresh or shared link.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: resolvedPrice, quantity: 1 }],
      mode: "subscription",
      // Force card-only — disables Stripe Link signup/redirect to link.com
      payment_method_types: ["card"],
      success_url: `${origin}/dashboard?subscribed=1&plan=${planParam}&price=${priceParam}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?checkout=cancelled&plan=${planParam}&price=${priceParam}`,
      metadata: { plan: plan ?? "custom", price_id: resolvedPrice, user_id: user.id },
      client_reference_id: user.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
