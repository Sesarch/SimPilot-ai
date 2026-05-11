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

    // ---- DIAGNOSTICS: Stripe mode + key fingerprint + price/account info ----
    // Lets admins spot test/live mismatches and branding swaps at a glance.
    // The full secret is never returned — only the prefix and last 4 chars.
    if (req.method === "GET" && action === "diagnostics") {
      const rawKey = stripeKey;
      // sk_test_..., sk_live_..., rk_test_..., rk_live_...
      const isLive = rawKey.includes("_live_");
      const isTest = rawKey.includes("_test_");
      const keyType = rawKey.startsWith("rk_") ? "restricted" : "secret";
      const fingerprint =
        rawKey.length > 12
          ? `${rawKey.slice(0, 8)}…${rawKey.slice(-4)}`
          : "unknown";

      // Account-level info (drives the branding shown on Checkout).
      let account: any = null;
      try {
        const acct = await stripe.accounts.retrieve();
        account = {
          id: acct.id,
          country: acct.country,
          business_name:
            acct.settings?.dashboard?.display_name ??
            acct.business_profile?.name ??
            null,
          support_email: acct.business_profile?.support_email ?? null,
          branding: {
            icon: acct.settings?.branding?.icon ?? null,
            logo: acct.settings?.branding?.logo ?? null,
            primary_color: acct.settings?.branding?.primary_color ?? null,
            secondary_color: acct.settings?.branding?.secondary_color ?? null,
          },
          charges_enabled: acct.charges_enabled,
          livemode: (acct as any).livemode ?? null,
        };
      } catch (e) {
        account = { error: (e as Error).message };
      }

      // Resolve the canonical SimPilot price IDs so the UI can flag a
      // test-mode price that's been wired into a live key (or vice-versa).
      const PRICE_IDS: Record<string, string> = {
        student: "price_1TNf5ZRusIXFsWjchdY05u0R",
        pro: "price_1TQhYjRusIXFsWjc3wGvpiqS",
        ultra: "price_1TQhZBRusIXFsWjc2jrUeFEi",
      };
      const prices: Array<{
        plan: string;
        id: string;
        ok: boolean;
        livemode?: boolean;
        nickname?: string | null;
        unit_amount?: number | null;
        currency?: string | null;
        product?: string | null;
        error?: string;
      }> = [];
      for (const [plan, id] of Object.entries(PRICE_IDS)) {
        try {
          const p = await stripe.prices.retrieve(id);
          prices.push({
            plan,
            id,
            ok: true,
            livemode: p.livemode,
            nickname: p.nickname,
            unit_amount: p.unit_amount,
            currency: p.currency,
            product: typeof p.product === "string" ? p.product : p.product?.id ?? null,
          });
        } catch (e) {
          prices.push({ plan, id, ok: false, error: (e as Error).message });
        }
      }

      // Probe additional scopes used by checkout / subscription verification.
      const probe = async (fn: () => Promise<unknown>) => {
        try { await fn(); return { ok: true as const }; }
        catch (e) { return { ok: false as const, error: (e as Error).message }; }
      };
      const firstProduct = prices.find((p) => p.ok && p.product)?.product ?? null;
      const [productsScope, customersScope, subscriptionsScope] = await Promise.all([
        firstProduct
          ? probe(() => stripe.products.retrieve(firstProduct))
          : Promise.resolve({ ok: false as const, error: "no product to test" }),
        probe(() => stripe.customers.list({ limit: 1 })),
        probe(() => stripe.subscriptions.list({ limit: 1 })),
      ]);

      const scopes = {
        prices_read: { ok: prices.length > 0 && prices.every((p) => p.ok) },
        products_read: productsScope,
        account_read: { ok: !account?.error, error: account?.error },
        branding_set: {
          ok: !account?.error && !!(
            account?.branding?.icon ||
            account?.branding?.logo ||
            account?.branding?.primary_color
          ),
        },
        charges_enabled: { ok: !!account?.charges_enabled },
        customers_read: customersScope,
        subscriptions_read: subscriptionsScope,
      };

      return json({
        mode: isLive ? "live" : isTest ? "test" : "unknown",
        key: { type: keyType, fingerprint, prefix: rawKey.slice(0, 8) },
        account,
        prices,
        scopes,
        checked_at: new Date().toISOString(),
      });
    }

    // ---- WEBHOOK STATUS: signing-secret presence, Stripe endpoints, recent deliveries ----
    if (req.method === "GET" && action === "webhook-status") {
      const expectedUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-webhook`;
      const hasSigningSecret = !!Deno.env.get("STRIPE_WEBHOOK_SECRET");

      // 1) Configured Stripe webhook endpoints
      let endpoints: Array<{
        id: string;
        url: string;
        status: string;
        enabled_events: string[];
        api_version: string | null;
        livemode: boolean;
        matches_expected: boolean;
      }> = [];
      let endpointsError: string | null = null;
      try {
        const list = await stripe.webhookEndpoints.list({ limit: 30 });
        endpoints = list.data.map((e) => ({
          id: e.id,
          url: e.url,
          status: e.status,
          enabled_events: e.enabled_events ?? [],
          api_version: e.api_version ?? null,
          livemode: e.livemode,
          matches_expected: e.url === expectedUrl,
        }));
      } catch (e) {
        endpointsError = (e as Error).message;
      }

      // 2) Persisted delivery log — counts and last 20
      const REQUIRED_EVENTS = [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
      ];

      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

      const [{ count: totalCount }, { count: count24h }, { count: count7d }, recent] = await Promise.all([
        admin.from("stripe_webhook_events").select("*", { count: "exact", head: true }),
        admin.from("stripe_webhook_events").select("*", { count: "exact", head: true }).gte("created_at", since24h),
        admin.from("stripe_webhook_events").select("*", { count: "exact", head: true }).gte("created_at", since7d),
        admin
          .from("stripe_webhook_events")
          .select("stripe_event_id, event_type, livemode, status, user_id, customer_id, subscription_id, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      // Pick the endpoint that points to our function and check coverage
      const matching = endpoints.find((e) => e.matches_expected) ?? null;
      const missingEvents = matching
        ? REQUIRED_EVENTS.filter((evt) => !matching.enabled_events.includes(evt) && !matching.enabled_events.includes("*"))
        : REQUIRED_EVENTS;

      // Overall health verdict
      const totalEvents = totalCount ?? 0;
      let verdict: "healthy" | "warning" | "error" = "error";
      if (hasSigningSecret && matching && matching.status === "enabled" && missingEvents.length === 0 && (count7d ?? 0) > 0) {
        verdict = "healthy";
      } else if (hasSigningSecret && matching && missingEvents.length === 0) {
        verdict = "warning"; // configured but no recent deliveries
      }

      return new Response(
        JSON.stringify({
          verdict,
          expected_url: expectedUrl,
          signing_secret_configured: hasSigningSecret,
          endpoints,
          endpoints_error: endpointsError,
          matching_endpoint: matching,
          required_events: REQUIRED_EVENTS,
          missing_events: missingEvents,
          counts: {
            total: totalEvents,
            last_24h: count24h ?? 0,
            last_7d: count7d ?? 0,
          },
          recent: recent.data ?? [],
          checked_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


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

      if (action === "extend-trial") {
        const { user_id, months, reason } = body;
        const m = Number(months);
        if (!user_id || !Number.isFinite(m) || m <= 0 || m > 120) {
          return badReq("user_id and months (1-120) required");
        }
        // Fetch current trial_ends_at
        const { data: profile, error: pErr } = await admin
          .from("profiles")
          .select("trial_ends_at")
          .eq("user_id", user_id)
          .maybeSingle();
        if (pErr) throw pErr;

        const now = new Date();
        const baseMs = profile?.trial_ends_at
          ? Math.max(new Date(profile.trial_ends_at).getTime(), now.getTime())
          : now.getTime();
        const newEnd = new Date(baseMs);
        // Add months by calendar
        newEnd.setMonth(newEnd.getMonth() + Math.floor(m));
        // Handle fractional months as days (30/mo)
        const fractional = m - Math.floor(m);
        if (fractional > 0) {
          newEnd.setDate(newEnd.getDate() + Math.round(fractional * 30));
        }

        const { data: updated, error: uErr } = await admin
          .from("profiles")
          .update({ trial_ends_at: newEnd.toISOString() })
          .eq("user_id", user_id)
          .select("trial_ends_at")
          .single();
        if (uErr) throw uErr;

        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "trial.extend",
          targetType: "user",
          targetId: user_id,
          details: {
            months: m,
            reason: reason || null,
            previous_ends_at: profile?.trial_ends_at || null,
            new_ends_at: updated.trial_ends_at,
          },
          req,
        });
        return json({ success: true, trial_ends_at: updated.trial_ends_at });
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
