/**
 * SimPilot Bridge — JWT verification
 * ----------------------------------------------------------------------------
 * Accepts TWO classes of token on the local WebSocket:
 *
 *  1. Supabase access tokens (HS256/RS256 from Supabase Auth)
 *     - Verified against the project's JWKS endpoint.
 *     - Required claims: iss, aud=authenticated, exp, sub.
 *
 *  2. Pairing JWTs (HS256, signed with BRIDGE_PAIRING_SECRET)
 *     - Minted by the `bridge-pair-token` edge function and handed to the
 *       desktop app via the simpilot://pair?token=... deep link.
 *     - Required claims: scope=bridge:pair, exp, sub.
 *     - Short-lived (5 min) — verified offline using the shared HMAC secret.
 *
 * The verifier tries the cheap, offline pairing-secret path first (most
 * desktop sessions arrive that way) and falls back to the JWKS verification
 * for browser tabs that connect with a real Supabase session.
 *
 * Configure via env vars:
 *   SIMPILOT_SUPABASE_URL    e.g. https://fzlugoeiozjknbltqyhm.supabase.co
 *   SIMPILOT_PROJECT_REF     fallback if URL not set
 *   BRIDGE_PAIRING_SECRET    shared with the bridge-pair-token edge function
 */

import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";

const DEFAULT_PROJECT_REF = "fzlugoeiozjknbltqyhm";

function resolveSupabaseUrl() {
  if (process.env.SIMPILOT_SUPABASE_URL) {
    return process.env.SIMPILOT_SUPABASE_URL.replace(/\/+$/, "");
  }
  const ref = process.env.SIMPILOT_PROJECT_REF || DEFAULT_PROJECT_REF;
  return `https://${ref}.supabase.co`;
}

const SUPABASE_URL = resolveSupabaseUrl();
const JWKS_URL = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
const ISSUER = `${SUPABASE_URL}/auth/v1`;

const jwks = createRemoteJWKSet(JWKS_URL, {
  cooldownDuration: 30_000,
  cacheMaxAge: 10 * 60_000,
});

// Shared HMAC secret for pairing JWTs. If not set, pairing-token auth is
// disabled and the bridge falls back to Supabase-only verification.
const PAIRING_SECRET = process.env.BRIDGE_PAIRING_SECRET || "";
const pairingKey = PAIRING_SECRET
  ? new TextEncoder().encode(PAIRING_SECRET)
  : null;

console.log(`[bridge] auth: verifying Supabase tokens against ${JWKS_URL.toString()}`);
if (pairingKey) {
  console.log("[bridge] auth: pairing JWTs (BRIDGE_PAIRING_SECRET) ENABLED");
} else {
  console.log("[bridge] auth: pairing JWTs DISABLED (set BRIDGE_PAIRING_SECRET to enable)");
}

/**
 * Cheap pre-check — peek at the JWT payload (no signature verification) so we
 * can route it to the correct verifier. This avoids a wasted JWKS fetch when
 * the desktop app hands us a pairing token.
 */
function peekScope(token) {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}

/**
 * Verify a pairing JWT signed with the shared HMAC secret.
 * Required claims: scope === "bridge:pair", sub, exp.
 */
async function verifyPairingToken(token) {
  if (!pairingKey) throw new Error("Pairing tokens disabled on this bridge");
  const { payload } = await jwtVerify(token, pairingKey, {
    algorithms: ["HS256"],
  });
  if (payload.scope !== "bridge:pair") {
    throw new Error("Pairing token has wrong scope");
  }
  if (!payload.sub) throw new Error("Pairing token missing sub");
  return {
    sub: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : undefined,
    exp: Number(payload.exp ?? 0),
    source: "pairing",
  };
}

/**
 * Verify a Supabase access token against the project's JWKS.
 */
async function verifySupabaseToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
    audience: "authenticated",
  });
  if (!payload.sub) throw new Error("Token missing sub");
  return {
    sub: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : undefined,
    exp: Number(payload.exp ?? 0),
    source: "supabase",
  };
}

/**
 * @param {string} token
 * @returns {Promise<{ sub: string, email?: string, exp: number, source: "pairing" | "supabase" }>}
 */
export async function verifyAccessToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }

  // Route by inspecting the unverified payload first. Pairing tokens carry
  // scope="bridge:pair"; everything else is treated as a Supabase session.
  const claims = peekScope(token);
  const looksLikePairing = claims?.scope === "bridge:pair";

  if (looksLikePairing) {
    if (!pairingKey) {
      throw new Error("Pairing token rejected: BRIDGE_PAIRING_SECRET not configured on bridge");
    }
    return verifyPairingToken(token);
  }

  // Default path: Supabase session token. If verification fails AND a pairing
  // secret is configured, try the pairing path as a last resort — handles the
  // edge case where a future token format omits the scope claim.
  try {
    return await verifySupabaseToken(token);
  } catch (err) {
    if (pairingKey) {
      try {
        return await verifyPairingToken(token);
      } catch {
        // fall through and rethrow the original Supabase error for clarity
      }
    }
    throw err;
  }
}
