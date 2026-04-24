import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tiered pricing — base price per seat per year, with bulk discounts.
// Base: $99/yr per student (~ Pro Pilot annual)
const BASE_PRICE_CENTS = 9900;

function discountFor(seats: number): number {
  if (seats >= 26) return 25;
  if (seats >= 11) return 20;
  if (seats >= 5) return 15;
  return 0;
}

function calculatePrice(seats: number) {
  const discountPercent = discountFor(seats);
  const subtotal = BASE_PRICE_CENTS * seats;
  const discountCents = Math.round((subtotal * discountPercent) / 100);
  const totalCents = subtotal - discountCents;
  const perSeatCents = Math.round(totalCents / seats);
  return { discountPercent, subtotal, discountCents, totalCents, perSeatCents };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const schoolName = String(body.school_name || "").trim().slice(0, 200);
    const contactEmail = String(body.contact_email || "").trim().toLowerCase().slice(0, 255);
    const contactName = String(body.contact_name || "").trim().slice(0, 200);
    const seats = Math.max(1, Math.min(500, parseInt(body.seats || "0", 10)));

    if (!schoolName) throw new Error("School name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error("Valid contact email required");
    if (seats < 5) throw new Error("Minimum 5 seats required for bulk pricing");

    const pricing = calculatePrice(seats);

    // Quote-only mode (no checkout, just return numbers)
    if (body.quote_only) {
      return new Response(JSON.stringify({ ...pricing, seats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://simpilot.ai";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: contactEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `SimPilot.AI — ${seats} student seats (12 months)`,
              description: `Bulk plan for ${schoolName}. ${pricing.discountPercent}% bulk discount applied. Includes ${seats} unique signup codes.`,
            },
            unit_amount: pricing.totalCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/for-schools/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/for-schools`,
      metadata: {
        kind: "school_bulk",
        school_name: schoolName,
        contact_email: contactEmail,
        contact_name: contactName,
        seats: String(seats),
        discount_percent: String(pricing.discountPercent),
      },
    });

    // Pre-create the purchase row in 'pending' state so we can reconcile later
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await supabase.from("school_purchases").insert({
      school_name: schoolName,
      contact_email: contactEmail,
      contact_name: contactName || null,
      seats_purchased: seats,
      discount_percent: pricing.discountPercent,
      amount_paid_cents: pricing.totalCents,
      currency: "usd",
      stripe_session_id: session.id,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, ...pricing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("school-bulk-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
