// Shared trial-and-subscription gate for AI edge functions.
//
// Returns { allowed: true } when:
//   - request has no auth header (anonymous — client-side anon limits apply), OR
//   - user has an active/trialing Stripe subscription, OR
//   - user's 7-day in-app trial has not expired yet.
//
// Otherwise returns { allowed: false, reason } so the caller can short-circuit
// with a 402 BEFORE burning any LOVABLE_API_KEY tokens.
//
// IMPORTANT: keep this stateless and cheap — one profile read per call.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export type AccessResult =
  | { allowed: true; userId: string | null; reason?: undefined }
  | { allowed: false; userId: string | null; reason: "trial_expired" };

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function checkAiAccess(req: Request): Promise<AccessResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    // Anonymous — client-side anon-message limits handle this path.
    return { allowed: true, userId: null };
  }

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const { data: userData } = await sb.auth.getUser(token);
  const user = userData?.user;
  if (!user) {
    // Token didn't resolve to a user — treat as anonymous, do not block.
    return { allowed: true, userId: null };
  }

  // Admins always allowed.
  const { data: adminRole } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRole) return { allowed: true, userId: user.id };

  const { data: profile } = await sb
    .from("profiles")
    .select("trial_ends_at, subscription_status, lifetime_access_started_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Lifetime / paid users.
  if (profile?.lifetime_access_started_at) return { allowed: true, userId: user.id };
  if (profile?.subscription_status && ACTIVE_STATUSES.has(profile.subscription_status)) {
    return { allowed: true, userId: user.id };
  }

  // Trial window.
  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0;
  if (trialEnd && trialEnd > Date.now()) {
    return { allowed: true, userId: user.id };
  }

  return { allowed: false, userId: user.id, reason: "trial_expired" };
}

export function trialExpiredResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "trial_expired",
      message:
        "Your 7-day free trial has ended. Upgrade to SimPilot Pro or Ultra to continue using the AI flight instructor.",
    }),
    {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
