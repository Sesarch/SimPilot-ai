import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      return new Response(
        JSON.stringify({ invoices: [], payment_method: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    const customer = customers.data[0];

    // Invoices
    const invoiceList = await stripe.invoices.list({ customer: customer.id, limit: 12 });
    const invoices = invoiceList.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      amount_due: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      // deno-lint-ignore no-explicit-any
      period_start: (inv as any).period_start ?? null,
      // deno-lint-ignore no-explicit-any
      period_end: (inv as any).period_end ?? null,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }));

    // Default payment method
    let pmId: string | null = null;
    const defaultPm = (customer.invoice_settings?.default_payment_method ?? null) as
      | string
      | Stripe.PaymentMethod
      | null;
    if (defaultPm) {
      pmId = typeof defaultPm === "string" ? defaultPm : defaultPm.id;
    } else {
      // Fallback: active subscription's default PM
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 5,
      });
      const activeSub = subs.data
        .filter((s) => ["active", "trialing", "past_due"].includes(s.status))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
      const subPm = activeSub?.default_payment_method;
      if (subPm) pmId = typeof subPm === "string" ? subPm : subPm.id;
    }

    let payment_method: {
      brand?: string;
      last4?: string;
      exp_month?: number;
      exp_year?: number;
      type?: string;
    } | null = null;
    if (pmId) {
      try {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        payment_method = {
          type: pm.type,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
        };
      } catch (e) {
        console.error("[billing-details] pm retrieve failed", e);
      }
    }

    return new Response(
      JSON.stringify({ invoices, payment_method }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[billing-details]", msg);
    return new Response(
      JSON.stringify({ error: msg, invoices: [], payment_method: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
