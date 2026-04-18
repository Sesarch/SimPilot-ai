/**
 * SimPilot Bridge — JWT verification
 * ----------------------------------------------------------------------------
 * Verifies Supabase access tokens locally against the project's JWKS endpoint.
 *
 * - Fetches the JWKS once at startup and caches it in-memory (jose handles
 *   rotation / re-fetch on key miss).
 * - Validates `iss`, `aud=authenticated`, and `exp` so a stale or wrong-project
 *   token is rejected even if its signature happens to verify.
 *
 * Configure via env vars:
 *   SIMPILOT_SUPABASE_URL   e.g. https://fzlugoeiozjknbltqyhm.supabase.co
 *   SIMPILOT_PROJECT_REF    fallback if URL not set
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

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

console.log(`[bridge] auth: verifying tokens against ${JWKS_URL.toString()}`);

/**
 * @param {string} token
 * @returns {Promise<{ sub: string, email?: string, exp: number }>}
 */
export async function verifyAccessToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
    audience: "authenticated",
  });
  if (!payload.sub) throw new Error("Token missing sub");
  return {
    sub: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : undefined,
    exp: Number(payload.exp ?? 0),
  };
}
