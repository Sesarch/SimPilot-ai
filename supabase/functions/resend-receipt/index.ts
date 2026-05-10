import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json(500, { error: "STRIPE_SECRET_KEY not configured" });

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Missing authorization" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });
    const user = userData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Optional: caller can pass a session_id from the success URL to scope to that checkout
    let body: { session_id?: string } = {};
    try { body = await req.json(); } catch { /* allow empty body */ }
    const sessionId = body.session_id?.trim();

    // 1) Resolve Stripe customer id
    let customerId: string | null = null;

    if (sessionId && sessionId.startsWith("cs_")) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (typeof session.customer === "string") customerId = session.customer;
        else if (session.customer && "id" in session.customer) customerId = session.customer.id;
      } catch (e) {
        console.warn("[resend-receipt] could not retrieve session", sessionId, e);
      }
    }

    if (!customerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      customerId = profile?.stripe_customer_id ?? null;
    }

    if (!customerId && user.email) {
      const found = await stripe.customers.list({ email: user.email, limit: 1 });
      if (found.data.length) customerId = found.data[0].id;
    }

    if (!customerId) return json(404, { error: "No Stripe customer on file" });

    // 2) Find the latest paid invoice for this customer
    const invoices = await stripe.invoices.list({
      customer: customerId,
      status: "paid",
      limit: 1,
    });
    const invoice = invoices.data[0];
    if (!invoice) return json(404, { error: "No paid invoice found yet" });

    const recipient = invoice.customer_email || user.email;
    if (!recipient) return json(400, { error: "No email on file for receipt" });

    // 3) Resend the receipt. Updating the charge's receipt_email re-sends
    //    the official Stripe receipt. Fall back to sending the invoice email
    //    when there's no associated charge (e.g. zero-amount / trial invoices).
    let method: "charge_receipt" | "invoice_email" = "charge_receipt";
    const chargeId =
      typeof invoice.charge === "string"
        ? invoice.charge
        : invoice.charge?.id ?? null;

    if (chargeId) {
      await stripe.charges.update(chargeId, { receipt_email: recipient });
    } else {
      method = "invoice_email";
      // sendInvoice only works on open invoices; for paid ones we surface the URL.
      // No-op here — the client will use hosted_invoice_url as a fallback.
    }

    return json(200, {
      ok: true,
      method,
      recipient,
      invoice_id: invoice.id,
      hosted_invoice_url: invoice.hosted_invoice_url,
      receipt_url:
        typeof invoice.charge === "object" && invoice.charge
          ? (invoice.charge as Stripe.Charge).receipt_url
          : null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[resend-receipt]", msg);
    return json(500, { error: msg });
  }
});
