import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Pull active recurring prices, expand product
    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      limit: 100,
      expand: ["data.product"],
    });

    const url = new URL(req.url);
    const audienceFilter = url.searchParams.get("audience") ?? "consumer";

    const plans = prices.data
      .filter((p) => {
        const prod = p.product as Stripe.Product;
        if (!prod || typeof prod !== "object" || prod.active === false) return false;
        const md = (prod.metadata || {}) as Record<string, string>;
        const priceMd = (p.metadata || {}) as Record<string, string>;
        // Hidden plans never surface
        if (md.hidden === "true" || priceMd.hidden === "true") return false;
        // Audience filter: default 'consumer' excludes school/team plans unless requested
        const audience = (md.audience || priceMd.audience || "consumer").toLowerCase();
        if (audienceFilter !== "all" && audience !== audienceFilter) return false;
        return true;
      })
      .map((p) => {
        const prod = p.product as Stripe.Product;
        const md = prod.metadata || {};
        return {
          price_id: p.id,
          product_id: prod.id,
          name: prod.name,
          description: prod.description,
          amount: p.unit_amount ?? 0,
          currency: p.currency,
          interval: p.recurring?.interval ?? "month",
          interval_count: p.recurring?.interval_count ?? 1,
          features: (prod as any).marketing_features?.map((f: any) => f.name)
            ?? (md.features ? String(md.features).split("|").map((s) => s.trim()).filter(Boolean) : []),
          tagline: md.tagline ?? null,
          badge: md.badge ?? null,
          highlighted: md.highlighted === "true",
          sort_order: md.sort_order ? parseInt(md.sort_order, 10) : p.unit_amount ?? 0,
          metadata: md,
        };
      })
      .sort((a, b) => a.sort_order - b.sort_order);

    return new Response(JSON.stringify({ plans }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[list-plans]", msg);
    return new Response(JSON.stringify({ error: msg, plans: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
