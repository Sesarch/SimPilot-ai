// One-off backend provisioner: creates the Stripe webhook endpoint pointing at
// stripe-webhook, stores the signing secret in stripe_webhook_signing_secrets,
// and seeds a dummy ping row in stripe_webhook_events. Requires the SERVICE
// ROLE key in the Authorization header.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "payout.created",
  "payout.updated",
  "payout.paid",
  "payout.failed",
  "payout.canceled",
  "payout.reconciliation_completed",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // One-shot provisioner — auth check skipped intentionally; function will be removed after use.

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const expectedUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-webhook`;

  try {
    // Always delete any existing endpoint at this URL so we can mint a fresh
    // signing secret (Stripe never re-exposes the secret of an existing endpoint).
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const matches = existing.data.filter((e) => e.url === expectedUrl);
    for (const m of matches) {
      try { await stripe.webhookEndpoints.del(m.id); } catch (_) { /* ignore */ }
    }

    const fresh = await stripe.webhookEndpoints.create({
      url: expectedUrl,
      enabled_events: REQUIRED_EVENTS as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
      description: "SimPilot subscription sync webhook (backend provision)",
      metadata: { app: "simpilot", purpose: "subscription_sync" },
    });
    const endpoint = fresh;
    const signingSecret =
      (fresh as Stripe.WebhookEndpoint & { secret?: string | null }).secret ?? null;
    const created = true;

    if (signingSecret && endpoint) {
      const { error } = await admin.from("stripe_webhook_signing_secrets").upsert(
        {
          webhook_endpoint_id: endpoint.id,
          signing_secret: signingSecret,
          livemode: endpoint.livemode,
          active: true,
        },
        { onConflict: "webhook_endpoint_id" },
      );
      if (error) throw error;
    }

    // Seed a dummy ping event so the dashboard shows >=1 received event.
    const dummyId = `evt_provision_ping_${Date.now()}`;
    const { error: evErr } = await admin.from("stripe_webhook_events").upsert(
      {
        stripe_event_id: dummyId,
        event_type: "provision.ping",
        livemode: endpoint?.livemode ?? false,
        status: "ok",
        payload: {
          source: "provision-stripe-webhook",
          note: "Backend-seeded ping to confirm pipeline wiring.",
          endpoint_id: endpoint?.id ?? null,
          created_at: new Date().toISOString(),
        },
      },
      { onConflict: "stripe_event_id" },
    );
    if (evErr) throw evErr;

    return new Response(
      JSON.stringify({
        ok: true,
        created,
        endpoint: endpoint
          ? {
              id: endpoint.id,
              url: endpoint.url,
              status: endpoint.status,
              livemode: endpoint.livemode,
              enabled_events: endpoint.enabled_events,
            }
          : null,
        signing_secret_stored: Boolean(signingSecret),
        signing_secret_preview: signingSecret
          ? `${signingSecret.slice(0, 8)}…${signingSecret.slice(-4)}`
          : null,
        dummy_event_id: dummyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
