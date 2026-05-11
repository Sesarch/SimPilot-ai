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

  log("event received", {
    type: event.type,
    id: event.id,
    account: (event as Stripe.Event & { account?: string }).account ?? null,
    livemode: event.livemode,
  });

  // Extract identifiers from the event payload for the persisted log row.
  function extractRefs(ev: Stripe.Event) {
    const obj = ev.data.object as Record<string, unknown>;
    const getStr = (k: string) => {
      const v = obj[k];
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && "id" in v && typeof (v as { id: unknown }).id === "string") {
        return (v as { id: string }).id;
      }
      return null;
    };
    return {
      object_id: typeof obj.id === "string" ? obj.id : null,
      customer_id: getStr("customer"),
      subscription_id: ev.type.startsWith("customer.subscription")
        ? (typeof obj.id === "string" ? obj.id : null)
        : getStr("subscription"),
      invoice_id: ev.type.startsWith("invoice")
        ? (typeof obj.id === "string" ? obj.id : null)
        : getStr("invoice"),
      checkout_session_id: ev.type.startsWith("checkout.session")
        ? (typeof obj.id === "string" ? obj.id : null)
        : null,
      status: typeof obj.status === "string" ? obj.status : null,
      amount_total: typeof obj.amount_total === "number" ? obj.amount_total : (typeof obj.amount_paid === "number" ? obj.amount_paid : null),
      currency: typeof obj.currency === "string" ? obj.currency : null,
      user_id_hint: (() => {
        const md = (obj.metadata as Record<string, string> | undefined) ?? {};
        return md.user_id ?? (typeof obj.client_reference_id === "string" ? obj.client_reference_id : null);
      })(),
    };
  }

  async function recordEvent(ev: Stripe.Event, resolvedUserId: string | null) {
    const refs = extractRefs(ev);
    const { error } = await supabase.from("stripe_webhook_events").upsert(
      {
        stripe_event_id: ev.id,
        event_type: ev.type,
        connected_account_id: (ev as Stripe.Event & { account?: string }).account ?? null,
        livemode: ev.livemode,
        object_id: refs.object_id,
        customer_id: refs.customer_id,
        subscription_id: refs.subscription_id,
        invoice_id: refs.invoice_id,
        checkout_session_id: refs.checkout_session_id,
        user_id: resolvedUserId ?? null,
        status: refs.status,
        amount_total: refs.amount_total,
        currency: refs.currency,
        payload: ev as unknown as Record<string, unknown>,
      },
      { onConflict: "stripe_event_id" },
    );
    if (error) log("event log insert failed", { id: ev.id, error: error.message });
  }

  try {
    let resolvedUserId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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
          resolvedUserId = userIdHint ?? null;
        } else if (session.customer && userIdHint) {
          const customerId =
            typeof session.customer === "string" ? session.customer : session.customer.id;
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", userIdHint);
          resolvedUserId = userIdHint;
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscription(stripe, sub);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        resolvedUserId = await findUserIdByCustomer(stripe, customerId);
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
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          resolvedUserId = await findUserIdByCustomer(stripe, customerId);
        }
        break;
      }

      case "payout.created":
      case "payout.updated":
      case "payout.paid":
      case "payout.failed":
      case "payout.canceled":
      case "payout.reconciliation_completed": {
        const payout = event.data.object as Stripe.Payout;
        const row = {
          stripe_payout_id: payout.id,
          connected_account_id:
            (event as Stripe.Event & { account?: string }).account ?? null,
          livemode: event.livemode,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          type: payout.type ?? null,
          method: payout.method ?? null,
          source_type: payout.source_type ?? null,
          statement_descriptor: payout.statement_descriptor ?? null,
          description: payout.description ?? null,
          failure_code: payout.failure_code ?? null,
          failure_message: payout.failure_message ?? null,
          arrival_date: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString()
            : null,
          stripe_created_at: payout.created
            ? new Date(payout.created * 1000).toISOString()
            : null,
          payload: payout as unknown as Record<string, unknown>,
          last_event_type: event.type,
          last_event_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("stripe_payouts")
          .upsert(row, { onConflict: "stripe_payout_id" });
        if (error) {
          log("payout upsert failed", { id: payout.id, error: error.message });
          throw error;
        }
        log("payout synced", { id: payout.id, status: payout.status });
        break;
      }

      default:
        log("unhandled event", { type: event.type });
    }

    // Always persist a log row, even for unhandled types — useful for audit.
    await recordEvent(event, resolvedUserId);


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
