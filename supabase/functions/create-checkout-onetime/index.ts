import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Stripe Checkout in `payment` (one-time) mode.
 * Used for Checkride Lifetime ($399) and conversation overage credits ($9/250).
 * Mirrors `create-checkout` but uses mode: "payment".
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan, price_id } = await req.json().catch(() => ({}));
    if (!price_id) {
      return new Response(JSON.stringify({ error: "Missing 'price_id'." }), {
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

    const ALLOWED_ORIGINS = [
      "https://simpilot.ai",
      "https://www.simpilot.ai",
      "https://soar-ai-guide.lovable.app",
    ];
    const rawOrigin = req.headers.get("origin") ?? "";
    const isLovablePreview = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(rawOrigin);
    const origin =
      ALLOWED_ORIGINS.includes(rawOrigin) || isLovablePreview ? rawOrigin : "https://simpilot.ai";

    const planParam = encodeURIComponent(plan ?? "onetime");
    const priceParam = encodeURIComponent(price_id);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${origin}/dashboard?purchased=1&plan=${planParam}&price=${priceParam}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled&plan=${planParam}`,
      metadata: { plan: plan ?? "onetime", price_id, user_id: user.id },
      client_reference_id: user.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
