/**
 * Shared accessor for the SimPilot Bridge release info that
 * BridgeSetupPage caches in localStorage. Other surfaces (Flight Deck) read
 * the same cache to render a "New version available" badge without making
 * their own GitHub API call.
 */

export type CachedBridgeRelease = {
  tagName: string;
  publishedAt: string | null;
  htmlUrl: string;
  installer: { name: string; downloadUrl: string; sizeBytes: number } | null;
  sha512: string | null;
};

const RELEASE_CACHE_KEY = "simpilot:bridge-release-cache:v1";

export function readCachedBridgeRelease(): CachedBridgeRelease | null {
  try {
    const raw = localStorage.getItem(RELEASE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cachedAt: number; release: CachedBridgeRelease | null };
    return parsed?.release ?? null;
  } catch {
    return null;
  }
}

/**
 * Loose semver comparison — strips a leading "v" and compares numeric segments.
 * Returns true when `latest` is strictly newer than `current`. Falls back to
 * `false` for malformed inputs so we never nag users with a false positive.
 */
export function isNewerVersion(current: string | null, latest: string | null): boolean {
  if (!current || !latest) return false;
  const parse = (v: string) =>
    v.replace(/^v/i, "").split(".").map((n) => Number.parseInt(n, 10));
  const a = parse(current);
  const b = parse(latest);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (bi > ai) return true;
    if (bi < ai) return false;
  }
  return false;
}
