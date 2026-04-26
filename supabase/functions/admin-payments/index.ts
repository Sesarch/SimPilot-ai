// Super Admin payments + subscriptions edge function.
// Actions: metrics, list, refund, cancel, change-plan, grant-comp, revoke-comp
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders, requireAdmin, logAdminAction } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { user, admin } = auth;

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // ---- METRICS: MRR, active subs, churn, 30d trend ----
    if (req.method === "GET" && action === "metrics") {
      const subs: Stripe.Subscription[] = [];
      let starting_after: string | undefined;
      // paginate up to 1000 subs (5 * 200)
      for (let i = 0; i < 5; i++) {
        const page = await stripe.subscriptions.list({
          status: "all",
          limit: 100,
          starting_after,
          expand: ["data.items.data.price"],
        });
        subs.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
      }

      let mrrCents = 0;
      let activeCount = 0;
      let trialingCount = 0;
      let pastDueCount = 0;
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 86400;
      let canceled30 = 0;
      let new30 = 0;

      for (const s of subs) {
        if (s.status === "active" || s.status === "trialing") {
          if (s.status === "active") activeCount++;
          if (s.status === "trialing") trialingCount++;
          for (const item of s.items.data) {
            const price = item.price;
            if (price.recurring) {
              const unit = price.unit_amount ?? 0;
              const qty = item.quantity ?? 1;
              const interval = price.recurring.interval;
              const count = price.recurring.interval_count || 1;
              // normalize to monthly
              let monthly = unit * qty;
              if (interval === "year") monthly = monthly / (12 * count);
              else if (interval === "week") monthly = monthly * (52 / 12) / count;
              else if (interval === "day") monthly = monthly * 30 / count;
              else if (interval === "month") monthly = monthly / count;
              mrrCents += monthly;
            }
          }
        }
        if (s.status === "past_due") pastDueCount++;
        if (s.canceled_at && s.canceled_at >= thirtyDaysAgo) canceled30++;
        if (s.created >= thirtyDaysAgo) new30++;
      }

      // 30-day daily trend (signups vs cancels)
      const trend: { date: string; signups: number; cancels: number }[] = [];
      for (let d = 29; d >= 0; d--) {
        const dayStart = now - (d + 1) * 86400;
        const dayEnd = now - d * 86400;
        const signups = subs.filter((s) => s.created >= dayStart && s.created < dayEnd).length;
        const cancels = subs.filter(
          (s) => s.canceled_at && s.canceled_at >= dayStart && s.canceled_at < dayEnd,
        ).length;
        const date = new Date(dayEnd * 1000).toISOString().slice(0, 10);
        trend.push({ date, signups, cancels });
      }

      const churnRate = activeCount + canceled30 > 0
        ? (canceled30 / (activeCount + canceled30)) * 100
        : 0;

      // Comp grants
      const { count: compCount } = await admin
        .from("user_comp_grants")
        .select("id", { count: "exact", head: true })
        .is("revoked_at", null);

      return json({
        mrr_cents: Math.round(mrrCents),
        active_subscriptions: activeCount,
        trialing: trialingCount,
        past_due: pastDueCount,
        canceled_last_30d: canceled30,
        new_last_30d: new30,
        churn_rate_pct: Number(churnRate.toFixed(2)),
        comp_grants_active: compCount || 0,
        trend,
      });
    }

    // ---- LIST subscriptions (with customer email) ----
    if (req.method === "GET" && action === "list-subscriptions") {
      const status = (url.searchParams.get("status") as Stripe.SubscriptionListParams["status"]) || "all";
      const page = await stripe.subscriptions.list({
        status,
        limit: 50,
        expand: ["data.customer"],
      });
      // Fetch products separately to avoid Stripe's 4-level expand limit
      const productIds = new Set<string>();
      for (const s of page.data) {
        const p = s.items.data[0]?.price;
        if (p && typeof p.product === "string") productIds.add(p.product);
      }
      const productMap = new Map<string, Stripe.Product>();
      await Promise.all(
        Array.from(productIds).map(async (pid) => {
          try {
            const prod = await stripe.products.retrieve(pid);
            productMap.set(pid, prod);
          } catch (_) { /* ignore */ }
        }),
      );
      const rows = page.data.map((s) => {
        const c = s.customer as Stripe.Customer;
        const item = s.items.data[0];
        const price = item?.price;
        const productId = typeof price?.product === "string" ? price.product : (price?.product as Stripe.Product | undefined)?.id;
        const product = productId ? productMap.get(productId) : undefined;
        return {
          id: s.id,
          status: s.status,
          customer_id: typeof s.customer === "string" ? s.customer : c?.id,
          customer_email: typeof s.customer === "string" ? null : c?.email,
          product_name: product?.name,
          amount_cents: price?.unit_amount,
          currency: price?.currency,
          interval: price?.recurring?.interval,
          current_period_end: s.current_period_end,
          cancel_at_period_end: s.cancel_at_period_end,
          created: s.created,
        };
      });
      return json({ subscriptions: rows, has_more: page.has_more });
    }

    // ---- LIST recent invoices ----
    if (req.method === "GET" && action === "list-invoices") {
      let page;
      try {
        page = await stripe.invoices.list({ limit: 50, expand: ["data.customer"] });
      } catch (e: any) {
        // Stripe restricted keys may lack credit_note_read perm, which invoices.list requires.
        if (e?.statusCode === 403 || e?.type === "StripePermissionError") {
          console.warn("[admin-payments] list-invoices permission denied:", e?.raw?.message || e?.message);
          return json({
            invoices: [],
            permission_denied: true,
            message: "Stripe API key is missing required permissions to list invoices (needs Credit Notes: Read and Invoices: Read).",
          });
        }
        throw e;
      }
      const rows = page.data.map((inv) => {
        const c = inv.customer as Stripe.Customer | string;
        return {
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount_paid: inv.amount_paid,
          amount_due: inv.amount_due,
          currency: inv.currency,
          customer_email: typeof c === "string" ? null : c?.email,
          created: inv.created,
          hosted_invoice_url: inv.hosted_invoice_url,
          payment_intent: inv.payment_intent,
        };
      });
      return json({ invoices: rows });
    }

    // ---- LIST audit log ----
    if (req.method === "GET" && action === "audit-log") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const { data, error } = await admin
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({ entries: data });
    }

    // ---- LIST comp grants ----
    if (req.method === "GET" && action === "list-comp-grants") {
      const { data, error } = await admin
        .from("user_comp_grants")
        .select("*")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ grants: data });
    }

    // ---- POST actions ----
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "log-load-failure") {
        const { attempts, error_message, error_code, status, endpoint, occurred_at } = body || {};
        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "payments.load_failure",
          targetType: "admin_payments_tab",
          details: {
            attempts: typeof attempts === "number" ? attempts : null,
            error_message: typeof error_message === "string" ? error_message.slice(0, 500) : null,
            error_code: error_code ?? null,
            status: status ?? null,
            endpoint: typeof endpoint === "string" ? endpoint.slice(0, 200) : null,
            occurred_at: occurred_at ?? new Date().toISOString(),
          },
          req,
        });
        return json({ logged: true });
      }

      if (action === "refund") {
        const { payment_intent, amount, reason } = body;
        if (!payment_intent) return badReq("payment_intent required");
        const refund = await stripe.refunds.create({
          payment_intent,
          amount: amount || undefined,
          reason: reason || undefined,
        });
        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "stripe.refund",
          targetType: "payment_intent",
          targetId: payment_intent,
          details: { amount, reason, refund_id: refund.id },
          req,
        });
        return json({ success: true, refund });
      }

      if (action === "cancel-subscription") {
        const { subscription_id, at_period_end } = body;
        if (!subscription_id) return badReq("subscription_id required");
        const sub = at_period_end
          ? await stripe.subscriptions.update(subscription_id, { cancel_at_period_end: true })
          : await stripe.subscriptions.cancel(subscription_id);
        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: at_period_end ? "stripe.cancel_at_period_end" : "stripe.cancel_immediate",
          targetType: "subscription",
          targetId: subscription_id,
          details: {},
          req,
        });
        return json({ success: true, subscription: sub });
      }

      if (action === "change-plan") {
        const { subscription_id, new_price_id } = body;
        if (!subscription_id || !new_price_id) return badReq("subscription_id and new_price_id required");
        const current = await stripe.subscriptions.retrieve(subscription_id);
        const itemId = current.items.data[0].id;
        const updated = await stripe.subscriptions.update(subscription_id, {
          items: [{ id: itemId, price: new_price_id }],
          proration_behavior: "create_prorations",
        });
        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "stripe.change_plan",
          targetType: "subscription",
          targetId: subscription_id,
          details: { new_price_id, prev_price_id: current.items.data[0].price.id },
          req,
        });
        return json({ success: true, subscription: updated });
      }

      if (action === "grant-comp") {
        const { user_id, plan_tier, reason, expires_at } = body;
        if (!user_id || !plan_tier) return badReq("user_id and plan_tier required");
        const { data, error } = await admin
          .from("user_comp_grants")
          .insert({
            user_id,
            plan_tier,
            reason: reason || null,
            expires_at: expires_at || null,
            granted_by: user.id,
            granted_by_email: user.email,
          })
          .select()
          .single();
        if (error) throw error;
        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "comp.grant",
          targetType: "user",
          targetId: user_id,
          details: { plan_tier, reason, expires_at },
          req,
        });
        return json({ success: true, grant: data });
      }

      if (action === "revoke-comp") {
        const { grant_id } = body;
        if (!grant_id) return badReq("grant_id required");
        const { data, error } = await admin
          .from("user_comp_grants")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", grant_id)
          .select()
          .single();
        if (error) throw error;
        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "comp.revoke",
          targetType: "comp_grant",
          targetId: grant_id,
          details: { user_id: data?.user_id },
          req,
        });
        return json({ success: true });
      }
    }

    return badReq("Invalid action");
  } catch (err) {
    console.error("[admin-payments] error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function badReq(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
