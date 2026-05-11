import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

// SimPilot Stripe price IDs → canonical plan label shown in the Users tab.
// Anything outside this map is ignored (treated as no SimPilot subscription).
// Flight School is sales-led and has no Stripe price; it is not listed here.
const PRICE_TO_TIER: Record<string, string> = {
  price_1TNf5ZRusIXFsWjchdY05u0R: "Student",
  price_1TQhYjRusIXFsWjc3wGvpiqS: "Pro Pilot",
  price_1TQhZBRusIXFsWjc2jrUeFEi: "Gold Seal CFI",
};

// Best-effort live Stripe lookup: returns a map of lowercased email -> subscription info.
// Records EVERY active/trialing/past_due subscription's price_id even if it is not a
// SimPilot plan, so the Users tab can show why a row is Free vs paid.
type LiveSub = {
  tier: string | null;          // canonical SimPilot label, or null when price isn't ours
  status: string;
  current_period_end: string | null;
  price_id: string;
  matched: boolean;             // true when price_id is one of the SimPilot plans
};
async function fetchStripeSubscriptionsByEmail(emails: string[]): Promise<Map<string, LiveSub>> {
  const result = new Map<string, LiveSub>();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey || emails.length === 0) return result;
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const wanted = new Set(emails.map((e) => e.toLowerCase()));

    // Pull active + trialing + past_due subs (paged) and only keep those whose customer
    // email matches a user. Prefer SimPilot-priced subs when a user has multiple.
    const statuses: Array<"active" | "trialing" | "past_due"> = ["active", "trialing", "past_due"];
    for (const status of statuses) {
      let starting_after: string | undefined = undefined;
      for (let i = 0; i < 5; i++) {
        const page = await stripe.subscriptions.list({
          status,
          limit: 100,
          expand: ["data.customer"],
          starting_after,
        });
        for (const sub of page.data) {
          const cust = sub.customer as Stripe.Customer | Stripe.DeletedCustomer;
          if (!cust || (cust as Stripe.DeletedCustomer).deleted) continue;
          const email = (cust as Stripe.Customer).email?.toLowerCase();
          if (!email || !wanted.has(email)) continue;

          const item = sub.items.data[0];
          const priceId = item?.price?.id ?? "";
          const tier = priceId ? PRICE_TO_TIER[priceId] ?? null : null;
          const matched = !!tier;
          // deno-lint-ignore no-explicit-any
          const cpe: number | undefined = (sub as any).current_period_end ?? (item as any)?.current_period_end;
          const candidate: LiveSub = {
            tier,
            status: sub.status,
            current_period_end: cpe ? new Date(cpe * 1000).toISOString() : null,
            price_id: priceId,
            matched,
          };
          const existing = result.get(email);
          // Keep the SimPilot-matched sub if we already saw one; otherwise upgrade
          // when we find a matched one, otherwise keep the first non-matched record.
          if (!existing) {
            result.set(email, candidate);
          } else if (!existing.matched && matched) {
            result.set(email, candidate);
          }
        }
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1]?.id;
        if (!starting_after) break;
      }
    }
  } catch (e) {
    console.error("[admin-users] stripe fallback failed", e);
  }
  return result;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}
async function audit(client: any, req: Request, adminId: string, adminEmail: string | null, action: string, targetId: string, details: Record<string, unknown> = {}) {
  try {
    await client.from("admin_audit_log").insert({
      admin_user_id: adminId,
      admin_email: adminEmail,
      action,
      target_type: "user",
      target_id: targetId,
      details,
      ip_address: getIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch (e) { console.error("audit fail", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST USERS
    if (req.method === "GET" && action === "list") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;

      // Get roles for all users
      const userIds = data.users.map((u: any) => u.id);
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Get profiles
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, terms_agreed_at, trial_ends_at, subscription_tier, subscription_status, subscription_current_period_end, subscription_source")
        .in("user_id", userIds);

      // Engagement: last_transmission (latest chat session updated_at)
      const { data: sessions } = await adminClient
        .from("chat_sessions")
        .select("user_id, updated_at")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false });
      const lastTxByUser = new Map<string, string>();
      (sessions || []).forEach((s: any) => {
        if (!lastTxByUser.has(s.user_id)) lastTxByUser.set(s.user_id, s.updated_at);
      });

      // Total sim hours from flight_logs
      const { data: logs } = await adminClient
        .from("flight_logs")
        .select("user_id, total_time")
        .in("user_id", userIds);
      const simHoursByUser = new Map<string, number>();
      (logs || []).forEach((l: any) => {
        simHoursByUser.set(l.user_id, (simHoursByUser.get(l.user_id) || 0) + Number(l.total_time || 0));
      });

      // Active comp grants
      const { data: grants } = await adminClient
        .from("user_comp_grants")
        .select("user_id, plan_tier, expires_at")
        .in("user_id", userIds)
        .is("revoked_at", null);
      const grantByUser = new Map<string, { plan_tier: string; expires_at: string | null }>();
      (grants || []).forEach((g: any) => grantByUser.set(g.user_id, { plan_tier: g.plan_tier, expires_at: g.expires_at }));

      // Aggregate trial extensions from admin_audit_log
      const { data: extendLogs } = await adminClient
        .from("admin_audit_log")
        .select("target_id, details")
        .eq("action", "trial.extend")
        .eq("target_type", "user")
        .in("target_id", userIds);
      const extendedMonthsByUser = new Map<string, number>();
      (extendLogs || []).forEach((row: any) => {
        const m = Number(row?.details?.months) || 0;
        if (!row.target_id || m <= 0) return;
        extendedMonthsByUser.set(row.target_id, (extendedMonthsByUser.get(row.target_id) || 0) + m);
      });

      // Live Stripe lookup. We now query for EVERY user with an email so the Users
      // tab can show the actual Stripe price ID (or "not found") in a tooltip,
      // enabling admins to audit why someone shows Free vs a paid plan.
      const profileByUser = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileByUser.set(p.user_id, p));
      const liveStripeStatuses = new Set(["active", "trialing", "past_due"]);
      const emailsNeedingLookup = data.users
        .filter((u: any) => !!u.email)
        .map((u: any) => u.email as string);
      const stripeByEmail = await fetchStripeSubscriptionsByEmail(emailsNeedingLookup);

      // Normalize profile tier to one of our canonical labels so we can compare
      // against live Stripe data and detect mismatches.
      const TIER_LABELS: Record<string, string> = {
        student: "Student",
        pro: "Pro Pilot",
        "pro pilot": "Pro Pilot",
        ultra: "Gold Seal CFI",
        "gold seal cfi": "Gold Seal CFI",
        flight_school: "Flight School",
        "flight school": "Flight School",
      };
      const canonicalizeTier = (t: string | null | undefined): string | null => {
        if (!t) return null;
        const k = String(t).toLowerCase().trim();
        if (k === "free" || k === "") return null;
        return TIER_LABELS[k] ?? null;
      };

      const enriched = data.users.map((u: any) => {
        const profile = profileByUser.get(u.id);
        const liveSub = u.email ? stripeByEmail.get(u.email.toLowerCase()) : undefined;
        const profileTierCanonical = canonicalizeTier(profile?.subscription_tier);
        const profileIsFlightSchool = profileTierCanonical === "Flight School";
        const profileTierIsMissingOrFree = !profileTierCanonical;
        // Flight School is sales-led: badge MUST come only from profile flag/metadata,
        // never from Stripe. Lock the tier to the profile when profile says Flight School.
        const liveSubUsable = !!liveSub && liveSub.matched;
        const useLiveSub =
          !profileIsFlightSchool &&
          liveSubUsable &&
          (!liveStripeStatuses.has(profile?.subscription_status) || profileTierIsMissingOrFree);
        const tier = profileIsFlightSchool
          ? "Flight School"
          : useLiveSub
            ? liveSub?.tier
            : profile?.subscription_tier || null;
        const status = profileIsFlightSchool
          ? profile?.subscription_status || "active"
          : useLiveSub ? liveSub?.status : profile?.subscription_status || null;
        const cpe = profileIsFlightSchool
          ? profile?.subscription_current_period_end || null
          : useLiveSub ? liveSub?.current_period_end : profile?.subscription_current_period_end || null;
        const source = profileIsFlightSchool
          ? profile?.subscription_source || "profile-flag"
          : profile?.subscription_source || (liveSubUsable ? "stripe-live" : null);

        // Consistency check: compare profile-declared tier with live Stripe data.
        let mismatch = false;
        let mismatchReason: string | null = null;
        const profileStatusActive = liveStripeStatuses.has(profile?.subscription_status);
        if (profileIsFlightSchool && liveSubUsable) {
          mismatch = true;
          mismatchReason = `Profile says Flight School but Stripe shows active ${liveSub?.tier} (${liveSub?.price_id})`;
        } else if (!profileIsFlightSchool) {
          if (liveSubUsable && profileTierCanonical && liveSub?.tier && liveSub.tier !== profileTierCanonical) {
            mismatch = true;
            mismatchReason = `Profile tier "${profileTierCanonical}" ≠ Stripe tier "${liveSub.tier}"`;
          } else if (liveSubUsable && profileTierIsMissingOrFree) {
            mismatch = true;
            mismatchReason = `Stripe has active ${liveSub?.tier} but profile is Free`;
          } else if (!liveSubUsable && profileTierCanonical && profileStatusActive) {
            // Profile claims an active paid SimPilot plan but no matching Stripe sub exists.
            mismatch = true;
            mismatchReason = liveSub
              ? `Profile says ${profileTierCanonical} but Stripe price ${liveSub.price_id} is not a SimPilot plan`
              : `Profile says ${profileTierCanonical} but no active Stripe subscription found`;
          }
        }
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          banned_until: u.banned_until,
          is_banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
          roles: (roles || []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
          display_name: profile?.display_name || null,
          terms_agreed_at: profile?.terms_agreed_at || null,
          trial_ends_at: profile?.trial_ends_at || null,
          subscription_tier: tier,
          subscription_status: status,
          subscription_current_period_end: cpe,
          subscription_source: source,
          // Audit fields for the Plan tooltip in the Users tab.
          stripe_price_id: liveSub?.price_id ?? null,
          stripe_price_matched: liveSub ? liveSub.matched : null,
          stripe_live_status: liveSub?.status ?? null,
          stripe_live_tier: liveSub?.tier ?? null,
          consistency_mismatch: mismatch,
          consistency_reason: mismatchReason,
          last_transmission_at: lastTxByUser.get(u.id) || null,
          total_sim_hours: Number((simHoursByUser.get(u.id) || 0).toFixed(1)),
          comp_grant: grantByUser.get(u.id) || null,
          extended_months: Math.round((extendedMonthsByUser.get(u.id) || 0) * 10) / 10,
        };
      });

      return new Response(JSON.stringify({ users: enriched, total: data.users.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "invite") {
        const { email } = body;
        if (!email || typeof email !== "string") {
          return new Response(JSON.stringify({ error: "Email is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email);
        if (error) throw error;
        await audit(adminClient, req, user.id, user.email ?? null, "user.invite", data.user?.id ?? email, { email });
        return new Response(JSON.stringify({ success: true, user: data.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "ban") {
        const { userId, duration } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Prevent self-ban
        if (userId === user.id) {
          return new Response(JSON.stringify({ error: "Cannot ban yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const banDuration = duration || "876000h"; // ~100 years = permanent
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: banDuration,
        });
        if (error) throw error;
        await audit(adminClient, req, user.id, user.email ?? null, "user.ban", userId, { duration: banDuration });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "unban") {
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) throw error;
        await audit(adminClient, req, user.id, user.email ?? null, "user.unban", userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete") {
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (userId === user.id) {
          return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        await audit(adminClient, req, user.id, user.email ?? null, "user.delete", userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "set-role") {
        const { userId, role } = body;
        if (!userId || !role) {
          return new Response(JSON.stringify({ error: "userId and role required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!["admin", "moderator", "user"].includes(role)) {
          return new Response(JSON.stringify({ error: "Invalid role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Clear existing roles and set new one
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        if (role !== "user") {
          const { error } = await adminClient
            .from("user_roles")
            .insert({ user_id: userId, role });
          if (error) throw error;
        }
        await audit(adminClient, req, user.id, user.email ?? null, "user.set_role", userId, { role });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
