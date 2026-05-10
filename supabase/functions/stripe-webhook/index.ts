// Stripe webhook handler — keeps profiles in sync with Stripe subscriptions.
// IMPORTANT: This function MUST run with verify_jwt = false (configured in supabase/config.toml)
// because Stripe calls it without a Supabase JWT. We authenticate the request via the
// Stripe signature header instead.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const s = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[stripe-webhook] ${step}${s}`);
};

// Canonical SimPilot price → tier map. Keep aligned with admin-payments + checkout.
const PRICE_TO_TIER: Record<string, "student" | "pro" | "ultra"> = {
  price_1TNf5ZRusIXFsWjchdY05u0R: "student",
  price_1TQhYjRusIXFsWjc3wGvpiqS: "pro",
  price_1TQhZBRusIXFsWjc2jrUeFEi: "ultra",
};

const tierFromSubscription = (sub: Stripe.Subscription) => {
  for (const item of sub.items.data) {
    const pid = item.price?.id;
    if (pid && PRICE_TO_TIER[pid]) return PRICE_TO_TIER[pid];
  }
  return null;
};

const periodEndISO = (sub: Stripe.Subscription) => {
  // Stripe stores epoch seconds. `current_period_end` exists on subscription items in newer
  // API versions, but the top-level field is still set on most subs we use.
  // deno-lint-ignore no-explicit-any
  const cpe = (sub as any).current_period_end ?? sub.items.data[0]?.current_period_end;
  return cpe ? new Date(cpe * 1000).toISOString() : null;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

async function findUserIdByCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<string | null> {
  // 1) Check profiles by stripe_customer_id (fast path once a sub has been written once).
  const { data: byCustomer } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (byCustomer?.user_id) return byCustomer.user_id;

  // 2) Fall back to looking up the customer's email in auth.users.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || (customer as Stripe.DeletedCustomer).deleted) return null;
    const email = (customer as Stripe.Customer).email?.toLowerCase();
    if (!email) return null;

    // List a few users and match by email (admin API doesn't expose by-email lookup directly).
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = list?.users.find((u) => u.email?.toLowerCase() === email);
    return match?.id ?? null;
  } catch (err) {
    log("findUserIdByCustomer failed", { err: String(err) });
    return null;
  }
}

async function applySubscription(
  stripe: Stripe,
  sub: Stripe.Subscription,
  userIdHint?: string | null,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = userIdHint ?? (await findUserIdByCustomer(stripe, customerId));
  if (!userId) {
    log("no user matched for subscription", { customerId, subId: sub.id });
    return;
  }

  const tier = tierFromSubscription(sub);
  const status = sub.status; // trialing | active | past_due | canceled | ...
  const expires = periodEndISO(sub);
  const isEntitled = status === "active" || status === "trialing";

  const update: Record<string, unknown> = {
    stripe_customer_id: customerId,
    subscription_id: sub.id,
    subscription_status: status,
    subscription_current_period_end: expires,
    subscription_source: "individual",
  };
  if (tier) update.subscription_tier = tier;
  // Only push subscription_expires_at while the sub grants access. When a sub is fully
  // canceled or unpaid, leave the existing expiry so the entitlement gate can handle grace.
  if (isEntitled && expires) update.subscription_expires_at = expires;
  if (status === "canceled") {
    update.subscription_expires_at = expires; // hard cutoff at period end
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("user_id", userId);
  if (error) {
    log("profile update failed", { userId, error: error.message });
    throw error;
  }
  log("profile updated", { userId, tier, status, expires });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    log("missing Stripe env");
    return new Response(JSON.stringify({ error: "server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    log("signature verification failed", { err: String(err) });
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Prefer client_reference_id / metadata.user_id when set by create-checkout.
        const userIdHint =
          (session.metadata?.user_id as string | undefined) ??
          session.client_reference_id ??
          null;

        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscription(stripe, sub, userIdHint);
        } else if (session.customer && userIdHint) {
          // One-off or setup mode — at least record the customer link.
          const customerId =
            typeof session.customer === "string" ? session.customer : session.customer.id;
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", userIdHint);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscription(stripe, sub);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // deno-lint-ignore no-explicit-any
        const subId = (invoice as any).subscription as string | null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscription(stripe, sub);
        }
        break;
      }

      default:
        log("unhandled event", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("handler error", { message });
    // Return 500 so Stripe retries.
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
