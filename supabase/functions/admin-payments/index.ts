// Super Admin payments + subscriptions edge function.
// Actions: metrics, list, refund, cancel, change-plan, grant-comp, revoke-comp
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders, requireAdmin, logAdminAction } from "../_shared/audit.ts";

const PRICE_TO_TIER: Record<string, "student" | "pro" | "ultra"> = {
  price_1TNf5ZRusIXFsWjchdY05u0R: "student",
  price_1TQhYjRusIXFsWjc3wGvpiqS: "pro",
  price_1TQhZBRusIXFsWjc2jrUeFEi: "ultra",
};

const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

const tierFromSubscription = (sub: Stripe.Subscription) => {
  for (const item of sub.items.data) {
    const priceId = item.price?.id;
    if (priceId && PRICE_TO_TIER[priceId]) return PRICE_TO_TIER[priceId];
  }
  return null;
};

const periodEndISO = (sub: Stripe.Subscription) => {
  const subWithPeriod = sub as Stripe.Subscription & { current_period_end?: number };
  const periodEnd = subWithPeriod.current_period_end ?? sub.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
};

type DiagnosticAccount = {
  id?: string;
  country?: string | null;
  business_name?: string | null;
  support_email?: string | null;
  branding?: { icon: string | null; logo: string | null; primary_color: string | null; secondary_color: string | null };
  charges_enabled?: boolean;
  livemode?: boolean | null;
  error?: string;
};

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
      } catch (e: unknown) {
        // Stripe restricted keys may lack credit_note_read perm, which invoices.list requires.
        const stripeError = e as { statusCode?: number; type?: string; raw?: { message?: string }; message?: string };
        if (stripeError.statusCode === 403 || stripeError.type === "StripePermissionError") {
          console.warn("[admin-payments] list-invoices permission denied:", stripeError.raw?.message || stripeError.message);
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
      let account: DiagnosticAccount = {};
      try {
        const acct = await stripe.accounts.retrieve();
        const acctWithMode = acct as Stripe.Account & { livemode?: boolean | null };
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
          livemode: acctWithMode.livemode ?? null,
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
        ? REQUIRED_WEBHOOK_EVENTS.filter((evt) => !matching.enabled_events.includes(evt) && !matching.enabled_events.includes("*"))
        : REQUIRED_WEBHOOK_EVENTS;

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
          required_events: REQUIRED_WEBHOOK_EVENTS,
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

    // ---- SEARCH webhook events by customer email or Stripe customer ID ----
    if (req.method === "GET" && action === "search-events") {
      const qRaw = (url.searchParams.get("q") ?? "").trim();
      if (!qRaw) return json({ events: [], query: "", resolved: {} });
      const q = qRaw.toLowerCase();
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

      const customerIds = new Set<string>();
      const userIds = new Set<string>();
      const resolved: { customer_ids: string[]; user_ids: string[]; email_matched: boolean } = {
        customer_ids: [], user_ids: [], email_matched: false,
      };

      if (/^cus_[a-z0-9]+$/i.test(qRaw)) {
        customerIds.add(qRaw);
      } else if (q.includes("@")) {
        // Resolve email -> user_id via auth.admin (paginate up to 1000 users)
        for (let pageIdx = 1; pageIdx <= 10; pageIdx++) {
          const { data, error } = await admin.auth.admin.listUsers({ page: pageIdx, perPage: 100 });
          if (error) break;
          for (const u of data.users) {
            if (u.email && u.email.toLowerCase() === q) userIds.add(u.id);
          }
          if (!data.users.length || data.users.length < 100) break;
        }
        // Resolve email -> Stripe customer_id(s)
        try {
          const list = await stripe.customers.list({ email: qRaw, limit: 20 });
          for (const c of list.data) customerIds.add(c.id);
        } catch (_) { /* ignore */ }
        resolved.email_matched = userIds.size > 0 || customerIds.size > 0;
      } else {
        // Fallback: substring match on customer_id
        const { data, error } = await admin
          .from("stripe_webhook_events")
          .select("stripe_event_id, event_type, livemode, status, user_id, customer_id, subscription_id, created_at")
          .ilike("customer_id", `%${qRaw}%`)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return json({
          events: data ?? [],
          query: qRaw,
          resolved: { customer_ids: [], user_ids: [], email_matched: false },
        });
      }

      resolved.customer_ids = Array.from(customerIds);
      resolved.user_ids = Array.from(userIds);

      if (customerIds.size === 0 && userIds.size === 0) {
        return json({ events: [], query: qRaw, resolved });
      }

      let query = admin
        .from("stripe_webhook_events")
        .select("stripe_event_id, event_type, livemode, status, user_id, customer_id, subscription_id, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      const orParts: string[] = [];
      if (customerIds.size) orParts.push(`customer_id.in.(${Array.from(customerIds).join(",")})`);
      if (userIds.size) orParts.push(`user_id.in.(${Array.from(userIds).join(",")})`);
      query = query.or(orParts.join(","));

      const { data, error } = await query;
      if (error) throw error;
      return json({ events: data ?? [], query: qRaw, resolved });
    }

    // ---- RECOVERY: backfill the local webhook delivery log from Stripe events ----
    if (req.method === "POST" && action === "backfill-webhook-events") {
      const body = await req.json().catch(() => ({}));
      const limit = Math.min(Math.max(Number(body?.limit) || 50, 1), 100);
      const wantedTypes = new Set<string>(
        Array.isArray(body?.event_types) && body.event_types.every((v: unknown) => typeof v === "string")
          ? body.event_types
          : REQUIRED_WEBHOOK_EVENTS,
      );

      const page = await stripe.events.list({ limit });
      const rows: Array<Record<string, unknown>> = [];
      const affectedUsers = new Set<string>();

      const findUserId = async (customerId: string | null, hint?: string | null) => {
        if (hint) return hint;
        if (!customerId) return null;
        const { data: byCustomer } = await admin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (byCustomer?.user_id) return byCustomer.user_id as string;
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer || (customer as Stripe.DeletedCustomer).deleted) return null;
          const email = (customer as Stripe.Customer).email?.toLowerCase();
          if (!email) return null;
          for (let pageIdx = 1; pageIdx <= 10; pageIdx++) {
            const { data, error } = await admin.auth.admin.listUsers({ page: pageIdx, perPage: 100 });
            if (error) break;
            const match = data.users.find((u) => u.email?.toLowerCase() === email);
            if (match) return match.id;
            if (data.users.length < 100) break;
          }
        } catch (_) { /* ignore */ }
        return null;
      };

      const syncSubscription = async (sub: Stripe.Subscription, userIdHint?: string | null) => {
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const userId = await findUserId(customerId, userIdHint);
        if (!userId) return null;
        const tier = tierFromSubscription(sub);
        const status = sub.status;
        const expires = periodEndISO(sub);
        const update: Record<string, unknown> = {
          stripe_customer_id: customerId,
          subscription_id: sub.id,
          subscription_status: status,
          subscription_current_period_end: expires,
          subscription_source: "individual",
        };
        if (tier) update.subscription_tier = tier;
        if ((status === "active" || status === "trialing" || status === "canceled") && expires) {
          update.subscription_expires_at = expires;
        }
        const { error } = await admin.from("profiles").update(update).eq("user_id", userId);
        if (error) throw error;
        affectedUsers.add(userId);
        return userId;
      };

      for (const ev of page.data) {
        if (!wantedTypes.has(ev.type)) continue;
        const obj = ev.data.object as Record<string, unknown>;
        const readId = (key: string) => {
          const value = obj[key];
          if (typeof value === "string") return value;
          if (value && typeof value === "object" && "id" in value && typeof (value as { id: unknown }).id === "string") {
            return (value as { id: string }).id;
          }
          return null;
        };
        const metadata = (obj.metadata as Record<string, string> | undefined) ?? {};
        const userIdHint = metadata.user_id ?? (typeof obj.client_reference_id === "string" ? obj.client_reference_id : null);
        const customerId = readId("customer");
        const subscriptionId = ev.type.startsWith("customer.subscription")
          ? (typeof obj.id === "string" ? obj.id : null)
          : readId("subscription");
        let resolvedUserId: string | null = null;

        if (ev.type.startsWith("customer.subscription")) {
          resolvedUserId = await syncSubscription(ev.data.object as Stripe.Subscription);
        } else if (ev.type === "checkout.session.completed" && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          resolvedUserId = await syncSubscription(sub, userIdHint);
        } else if ((ev.type === "invoice.payment_succeeded" || ev.type === "invoice.payment_failed") && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          resolvedUserId = await syncSubscription(sub);
        } else {
          resolvedUserId = await findUserId(customerId, userIdHint);
        }

        rows.push({
          stripe_event_id: ev.id,
          event_type: ev.type,
          connected_account_id: (ev as Stripe.Event & { account?: string }).account ?? null,
          livemode: ev.livemode,
          object_id: typeof obj.id === "string" ? obj.id : null,
          customer_id: customerId,
          subscription_id: subscriptionId,
          invoice_id: ev.type.startsWith("invoice") ? (typeof obj.id === "string" ? obj.id : null) : readId("invoice"),
          checkout_session_id: ev.type.startsWith("checkout.session") ? (typeof obj.id === "string" ? obj.id : null) : null,
          user_id: resolvedUserId,
          status: typeof obj.status === "string" ? obj.status : null,
          amount_total: typeof obj.amount_total === "number" ? obj.amount_total : (typeof obj.amount_paid === "number" ? obj.amount_paid : null),
          currency: typeof obj.currency === "string" ? obj.currency : null,
          payload: ev as unknown as Record<string, unknown>,
          created_at: new Date(ev.created * 1000).toISOString(),
          processed_at: new Date().toISOString(),
        });
      }

      if (rows.length) {
        const { error } = await admin.from("stripe_webhook_events").upsert(rows, { onConflict: "stripe_event_id" });
        if (error) throw error;
      }

      await logAdminAction(admin, {
        adminUserId: user.id,
        adminEmail: user.email,
        action: "stripe.webhook_events_backfill",
        targetType: "stripe_events",
        details: { imported: rows.length, affected_users: affectedUsers.size, limit },
        req,
      });

      return json({ imported: rows.length, affected_users: affectedUsers.size, has_more: page.has_more });
    }

    // ---- SUBSCRIPTION AUDIT: compare Stripe vs profiles.subscription_* ----
    if (req.method === "GET" && action === "subscription-audit") {
      // Map SimPilot price IDs -> tier (mirror of stripe-webhook / check-subscription)
      const PRICE_TO_TIER: Record<string, string> = {
        price_1TNf5ZRusIXFsWjchdY05u0R: "student",
        price_1TQhYjRusIXFsWjc3wGvpiqS: "pro",
        price_1TQhZBRusIXFsWjc2jrUeFEi: "ultra",
      };

      // 1) Pull all Stripe subs (active/trialing/past_due) — paginate up to 1000.
      const stripeSubs: Stripe.Subscription[] = [];
      let starting_after: string | undefined;
      for (let i = 0; i < 5; i++) {
        const page = await stripe.subscriptions.list({
          status: "all",
          limit: 100,
          starting_after,
          expand: ["data.customer", "data.items.data.price"],
        });
        stripeSubs.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
      }
      const liveStatuses = new Set(["active", "trialing", "past_due"]);
      const live = stripeSubs.filter((s) => liveStatuses.has(s.status));

      // Build (email -> chosen sub) preferring active > trialing > past_due.
      const rank = (s: Stripe.Subscription) =>
        s.status === "active" ? 0 : s.status === "trialing" ? 1 : 2;
      const byEmail = new Map<string, Stripe.Subscription>();
      for (const s of live) {
        const c = s.customer as Stripe.Customer | string;
        const email = (typeof c === "string" ? null : c?.email)?.toLowerCase();
        if (!email) continue;
        const existing = byEmail.get(email);
        if (!existing || rank(s) < rank(existing)) byEmail.set(email, s);
      }

      // 2) Pull profiles (with auth email via auth.admin).
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("user_id, subscription_tier, subscription_status, subscription_id, subscription_current_period_end, subscription_source, stripe_customer_id");
      if (pErr) throw pErr;

      // Map user_id -> email by paginating auth users (cap at first 1000).
      const userEmail = new Map<string, string>();
      for (let pageIdx = 1; pageIdx <= 10; pageIdx++) {
        const { data, error } = await admin.auth.admin.listUsers({ page: pageIdx, perPage: 100 });
        if (error) break;
        for (const u of data.users) if (u.email) userEmail.set(u.id, u.email.toLowerCase());
        if (!data.users.length || data.users.length < 100) break;
      }

      const profileByEmail = new Map<string, typeof profiles[number]>();
      const profilesWithEmail: Array<{ profile: typeof profiles[number]; email: string }> = [];
      for (const p of profiles ?? []) {
        const email = userEmail.get(p.user_id);
        if (!email) continue;
        profileByEmail.set(email, p);
        profilesWithEmail.push({ profile: p, email });
      }

      type Mismatch = {
        kind: "missing_in_profile" | "missing_in_stripe" | "tier_mismatch" | "status_mismatch" | "no_email";
        email: string | null;
        user_id: string | null;
        profile_tier: string | null;
        profile_status: string | null;
        stripe_tier: string | null;
        stripe_status: string | null;
        stripe_subscription_id: string | null;
        stripe_customer_id: string | null;
      };
      const mismatches: Mismatch[] = [];

      // a) Stripe has live sub, profile doesn't / wrong tier / wrong status.
      for (const [email, s] of byEmail) {
        const priceId = s.items.data[0]?.price?.id ?? "";
        const stripeTier = PRICE_TO_TIER[priceId] ?? null;
        const p = profileByEmail.get(email);
        const cust = s.customer as Stripe.Customer | string;
        const customerId = typeof cust === "string" ? cust : cust?.id ?? null;

        if (!p) {
          mismatches.push({
            kind: "missing_in_profile",
            email, user_id: null,
            profile_tier: null, profile_status: null,
            stripe_tier: stripeTier, stripe_status: s.status,
            stripe_subscription_id: s.id, stripe_customer_id: customerId,
          });
          continue;
        }
        const tierOk = stripeTier == null || p.subscription_tier === stripeTier;
        const statusOk = p.subscription_status === s.status;
        if (!tierOk) {
          mismatches.push({
            kind: "tier_mismatch",
            email, user_id: p.user_id,
            profile_tier: p.subscription_tier, profile_status: p.subscription_status,
            stripe_tier: stripeTier, stripe_status: s.status,
            stripe_subscription_id: s.id, stripe_customer_id: customerId,
          });
        } else if (!statusOk) {
          mismatches.push({
            kind: "status_mismatch",
            email, user_id: p.user_id,
            profile_tier: p.subscription_tier, profile_status: p.subscription_status,
            stripe_tier: stripeTier, stripe_status: s.status,
            stripe_subscription_id: s.id, stripe_customer_id: customerId,
          });
        }
      }

      // b) Profile claims a paid status but Stripe has no live sub.
      const paidStatuses = new Set(["active", "trialing", "past_due"]);
      for (const { profile: p, email } of profilesWithEmail) {
        if (!p.subscription_status || !paidStatuses.has(p.subscription_status)) continue;
        if (byEmail.has(email)) continue; // covered above
        mismatches.push({
          kind: "missing_in_stripe",
          email, user_id: p.user_id,
          profile_tier: p.subscription_tier, profile_status: p.subscription_status,
          stripe_tier: null, stripe_status: null,
          stripe_subscription_id: p.subscription_id ?? null,
          stripe_customer_id: p.stripe_customer_id ?? null,
        });
      }

      // c) Stripe live sub with no email on the customer (rare).
      const customersWithoutEmail = live.filter((s) => {
        const c = s.customer as Stripe.Customer | string;
        return typeof c !== "string" && !c?.email;
      }).map((s) => {
        const c = s.customer as Stripe.Customer;
        return {
          kind: "no_email" as const,
          email: null, user_id: null,
          profile_tier: null, profile_status: null,
          stripe_tier: PRICE_TO_TIER[s.items.data[0]?.price?.id ?? ""] ?? null,
          stripe_status: s.status,
          stripe_subscription_id: s.id,
          stripe_customer_id: c?.id ?? null,
        };
      });
      mismatches.push(...customersWithoutEmail);

      await logAdminAction(admin, {
        adminUserId: user.id,
        adminEmail: user.email,
        action: "subscription_audit.run",
        targetType: "system",
        details: {
          stripe_live_subs: live.length,
          profiles_scanned: profilesWithEmail.length,
          mismatch_count: mismatches.length,
        },
        req,
      });

      return json({
        checked_at: new Date().toISOString(),
        summary: {
          stripe_live_subscriptions: live.length,
          profiles_with_email: profilesWithEmail.length,
          mismatches: mismatches.length,
          by_kind: mismatches.reduce<Record<string, number>>((acc, m) => {
            acc[m.kind] = (acc[m.kind] ?? 0) + 1;
            return acc;
          }, {}),
        },
        mismatches,
      });
    }

    // ---- LIST EXTERNAL (non-SimPilot) SUBSCRIPTIONS ----
    if (req.method === "GET" && action === "list-external-subs") {
      const SIMPILOT_PRICE_IDS = new Set<string>([
        "price_1TNf5ZRusIXFsWjchdY05u0R", // Student
        "price_1TQhYjRusIXFsWjc3wGvpiqS", // Pro Pilot
        "price_1TQhZBRusIXFsWjc2jrUeFEi", // Gold Seal CFI
      ]);

      const stripeSubs: Stripe.Subscription[] = [];
      let starting_after: string | undefined;
      for (let i = 0; i < 5; i++) {
        const page = await stripe.subscriptions.list({
          status: "all",
          limit: 100,
          starting_after,
          expand: ["data.customer", "data.items.data.price"],
        });
        stripeSubs.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
      }
      const liveStatuses = new Set(["active", "trialing", "past_due"]);
      const live = stripeSubs.filter((s) => liveStatuses.has(s.status));

      const productNameById = new Map<string, string>();
      const productIds = new Set<string>();
      const externalSubs: Array<Record<string, unknown>> = [];

      for (const sub of live) {
        const item = sub.items.data[0];
        const priceId = item?.price?.id ?? null;
        if (priceId && SIMPILOT_PRICE_IDS.has(priceId)) continue;
        const productRef = item?.price?.product;
        const productId =
          typeof productRef === "string" ? productRef : productRef?.id ?? null;
        if (productId && !productNameById.has(productId)) {
          try {
            const product = await stripe.products.retrieve(productId);
            productNameById.set(productId, product.name || "");
          } catch (_) {
            productNameById.set(productId, "");
          }
        }
        if (productId) productIds.add(productId);

        const cust = sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string;
        let customerId: string | null = null;
        let customerEmail: string | null = null;
        if (typeof cust === "string") {
          customerId = cust;
        } else if (cust && !(cust as Stripe.DeletedCustomer).deleted) {
          customerId = (cust as Stripe.Customer).id;
          customerEmail = (cust as Stripe.Customer).email ?? null;
        }

        externalSubs.push({
          subscription_id: sub.id,
          status: sub.status,
          customer_id: customerId,
          customer_email: customerEmail,
          price_id: priceId,
          product_id: productId,
          product_name: productId ? productNameById.get(productId) || null : null,
          amount_cents: item?.price?.unit_amount ?? null,
          currency: item?.price?.currency ?? null,
        });
      }

      const products = Array.from(productIds).map((id) => ({
        product_id: id,
        product_name: productNameById.get(id) || null,
      }));

      return json({
        checked_at: new Date().toISOString(),
        subscriptions: externalSubs,
        products,
      });
    }

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

      // ---- PURGE EXTERNAL (non-SimPilot) SUBSCRIPTIONS + ARCHIVE PRODUCTS ----
      if (action === "purge-external-subs") {
        const SIMPILOT_PRICE_IDS = new Set<string>([
          "price_1TNf5ZRusIXFsWjchdY05u0R",
          "price_1TQhYjRusIXFsWjc3wGvpiqS",
          "price_1TQhZBRusIXFsWjc2jrUeFEi",
        ]);
        const reqSubIds: string[] = Array.isArray(body?.subscription_ids)
          ? body.subscription_ids.filter((s: unknown) => typeof s === "string")
          : [];
        const reqProductIds: string[] = Array.isArray(body?.product_ids)
          ? body.product_ids.filter((s: unknown) => typeof s === "string")
          : [];
        if (reqSubIds.length === 0 && reqProductIds.length === 0) {
          return badReq("subscription_ids or product_ids required");
        }

        const canceled: Array<{ id: string; status: string }> = [];
        const archivedProducts: Array<{ id: string; name: string | null }> = [];
        const errors: Array<{ id: string; kind: string; error: string }> = [];

        // Safety re-check: refuse to cancel any sub whose price is SimPilot.
        for (const subId of reqSubIds) {
          try {
            const current = await stripe.subscriptions.retrieve(subId, {
              expand: ["items.data.price"],
            });
            const priceId = current.items.data[0]?.price?.id;
            if (priceId && SIMPILOT_PRICE_IDS.has(priceId)) {
              errors.push({
                id: subId,
                kind: "subscription",
                error: "Refused: subscription uses a SimPilot price ID",
              });
              continue;
            }
            const canceledSub = await stripe.subscriptions.cancel(subId);
            canceled.push({ id: canceledSub.id, status: canceledSub.status });
          } catch (e) {
            errors.push({
              id: subId,
              kind: "subscription",
              error: (e as Error).message || String(e),
            });
          }
        }

        // Archive each requested product (active=false). Refuse to archive
        // any product that has a SimPilot price attached.
        for (const productId of reqProductIds) {
          try {
            const prices = await stripe.prices.list({ product: productId, limit: 100, active: true });
            const hasSimPilot = prices.data.some((p) => SIMPILOT_PRICE_IDS.has(p.id));
            if (hasSimPilot) {
              errors.push({
                id: productId,
                kind: "product",
                error: "Refused: product has a SimPilot price attached",
              });
              continue;
            }
            const updated = await stripe.products.update(productId, { active: false });
            archivedProducts.push({ id: updated.id, name: updated.name });
          } catch (e) {
            errors.push({
              id: productId,
              kind: "product",
              error: (e as Error).message || String(e),
            });
          }
        }

        await logAdminAction(admin, {
          adminUserId: user.id,
          adminEmail: user.email,
          action: "stripe.purge_external",
          targetType: "system",
          details: {
            requested_subscription_ids: reqSubIds,
            requested_product_ids: reqProductIds,
            canceled,
            archived_products: archivedProducts,
            errors,
          },
          req,
        });

        return json({
          success: errors.length === 0,
          canceled,
          archived_products: archivedProducts,
          errors,
        });
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
