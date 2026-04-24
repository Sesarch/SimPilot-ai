import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate readable 8-char codes (no ambiguous chars: 0/O, 1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  let s = "SP-";
  for (let i = 0; i < 8; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) throw new Error("session_id required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ status: "pending", message: "Payment not yet complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up purchase
    const { data: purchase, error: pErr } = await supabase
      .from("school_purchases")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!purchase) throw new Error("Purchase record not found");

    // Idempotent: if already paid + codes generated, return them
    const { data: existingCodes } = await supabase
      .from("school_seat_codes")
      .select("code")
      .eq("purchase_id", purchase.id);

    if (existingCodes && existingCodes.length === purchase.seats_purchased) {
      return new Response(JSON.stringify({
        status: "ready",
        school_name: purchase.school_name,
        contact_email: purchase.contact_email,
        seats: purchase.seats_purchased,
        expires_at: purchase.expires_at,
        codes: existingCodes.map((c) => c.code),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as paid + generate codes
    await supabase
      .from("school_purchases")
      .update({
        status: "paid",
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      })
      .eq("id", purchase.id);

    const codes: string[] = [];
    const seen = new Set<string>();
    while (codes.length < purchase.seats_purchased) {
      const c = generateCode();
      if (seen.has(c)) continue;
      seen.add(c);
      codes.push(c);
    }

    const inserts = codes.map((code) => ({ purchase_id: purchase.id, code }));
    const { error: insErr } = await supabase.from("school_seat_codes").insert(inserts);
    if (insErr) {
      // Likely a code collision; fail loudly so the school can refresh
      throw new Error(`Failed to generate codes: ${insErr.message}`);
    }

    return new Response(JSON.stringify({
      status: "ready",
      school_name: purchase.school_name,
      contact_email: purchase.contact_email,
      seats: purchase.seats_purchased,
      expires_at: purchase.expires_at,
      codes,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("school-finalize error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
