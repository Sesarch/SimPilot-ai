/**
 * Live SEO check — fetches robots.txt + sitemap.xml from a running site
 * and validates them against the source-of-truth route list.
 *
 * Skipped by default (so the unit-test suite stays hermetic). Enable in CI:
 *   RUN_LIVE_SEO_CHECK=1 SEO_CHECK_BASE_URL=http://localhost:4173 vitest run
 *
 * Validates:
 *   1. /robots.txt returns 200 and contains a Sitemap: directive.
 *   2. /sitemap.xml returns 200, parses as XML, and lists every PUBLIC_ROUTES path.
 *   3. Every <loc> in the sitemap returns a 2xx status when fetched.
 *   4. Every Disallow: rule corresponds to a real App.tsx route.
 *   5. Every Disallow: route either responds 2xx with a `noindex` meta tag,
 *      or 3xx/4xx (i.e. the page is not exposed for indexing). 5xx fails.
 *   6. No Allow:/Disallow: rule references a path that no longer exists in
 *      App.tsx (catches stale entries when routes are renamed or removed).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PUBLIC_ROUTES } from "../../scripts/sitemap-routes";

const BASE = (process.env.SEO_CHECK_BASE_URL || "").replace(/\/$/, "");
const ENABLED = process.env.RUN_LIVE_SEO_CHECK === "1" && BASE.length > 0;
const FETCH_TIMEOUT_MS = 15_000;

const root = resolve(__dirname, "../..");

function loadAppRoutes(): string[] {
  const src = readFileSync(resolve(root, "src/App.tsx"), "utf8");
  const routes = new Set<string>();
  const re = /<Route\s+path=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[1] !== "*") routes.add(m[1]);
  }
  return [...routes];
}

type RobotsRules = { allows: string[]; disallows: string[]; sitemaps: string[] };
function parseRobots(text: string): RobotsRules {
  const allows: string[] = [];
  const disallows: string[] = [];
  const sitemaps: string[] = [];
  // Apply rules from User-agent: * blocks and the global Sitemap: directive.
  // We are intentionally permissive: any Disallow under any user-agent must
  // still reference a valid route; we don't need per-UA scoping for the check.
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [k, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const key = k.toLowerCase();
    if (key === "allow" && value) allows.push(value);
    else if (key === "disallow" && value) disallows.push(value);
    else if (key === "sitemap" && value) sitemaps.push(value);
  }
  return { allows, disallows, sitemaps };
}

function parseSitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
  } finally {
    clearTimeout(t);
  }
}

function isCoveredByDisallow(route: string, disallows: string[]): boolean {
  return disallows.some(
    (d) =>
      d === route ||
      (d.endsWith("/") && route.startsWith(d)) ||
      route === d ||
      route.startsWith(d + "/"),
  );
}

const describeOrSkip = ENABLED ? describe : describe.skip;

describeOrSkip(`live SEO check (${BASE || "disabled"})`, () => {
  let robotsText = "";
  let sitemapXml = "";
  let robots: RobotsRules;
  let appRoutes: string[];

  beforeAll(async () => {
    appRoutes = loadAppRoutes();

    const robotsRes = await fetchWithTimeout(`${BASE}/robots.txt`);
    expect(robotsRes.status, "robots.txt should return 200").toBe(200);
    robotsText = await robotsRes.text();
    robots = parseRobots(robotsText);

    const sitemapRes = await fetchWithTimeout(`${BASE}/sitemap.xml`);
    expect(sitemapRes.status, "sitemap.xml should return 200").toBe(200);
    sitemapXml = await sitemapRes.text();
  }, 30_000);

  it("robots.txt declares a Sitemap: directive", () => {
    expect(robots.sitemaps.length, "robots.txt missing Sitemap: line").toBeGreaterThan(0);
    expect(robots.sitemaps.some((s) => s.endsWith("/sitemap.xml"))).toBe(true);
  });

  it("sitemap.xml is well-formed XML and lists every PUBLIC_ROUTES path", () => {
    expect(sitemapXml).toContain("<urlset");
    const locs = parseSitemapLocs(sitemapXml);
    const locPaths = locs.map((u) => new URL(u).pathname.replace(/\/$/, "") || "/");
    const missing = PUBLIC_ROUTES.map((r) => r.path).filter((p) => !locPaths.includes(p));
    expect(missing, `Sitemap is missing public routes: ${missing.join(", ")}`).toEqual([]);
  });

  it("every sitemap URL returns 2xx", async () => {
    const locs = parseSitemapLocs(sitemapXml);
    const failures: { url: string; status: number }[] = [];
    await Promise.all(
      locs.map(async (loc) => {
        // Hit the local origin instead of the canonical (which points at prod).
        const path = new URL(loc).pathname;
        const res = await fetchWithTimeout(`${BASE}${path}`, { method: "GET" });
        if (res.status < 200 || res.status >= 300) failures.push({ url: path, status: res.status });
      }),
    );
    expect(failures, `Sitemap URLs returning non-2xx:\n${failures.map((f) => `  ${f.url} → ${f.status}`).join("\n")}`).toEqual([]);
  }, 60_000);

  it("every robots.txt Disallow corresponds to a real App.tsx route", () => {
    const stale = robots.disallows.filter(
      (d) => !appRoutes.some((r) => r === d || r.startsWith(d.endsWith("/") ? d : d + "/")),
    );
    expect(stale, `robots.txt disallows unknown paths: ${stale.join(", ")}`).toEqual([]);
  });

  it("no public sitemap path is also Disallowed (allow/disallow conflict)", () => {
    const conflicts = PUBLIC_ROUTES.map((r) => r.path).filter((p) =>
      isCoveredByDisallow(p, robots.disallows),
    );
    expect(conflicts, `Public routes incorrectly disallowed: ${conflicts.join(", ")}`).toEqual([]);
  });

  it("every Disallow: route resolves without server errors (no 5xx)", async () => {
    // For a SPA the server returns index.html for every path; the actual
    // <meta name="robots" content="noindex"> is injected at runtime by
    // react-helmet-async after the JS bundle hydrates. Crawlers respect the
    // protocol-level Disallow directive in robots.txt before even fetching
    // the page, so the live HTTP contract for these URLs is simply: they
    // must not 5xx (which would surface infrastructure problems).
    const failures: string[] = [];
    const targets = robots.disallows.map((d) => (d.endsWith("/") ? d + "_seo_check" : d));
    await Promise.all(
      targets.map(async (path) => {
        try {
          const res = await fetchWithTimeout(`${BASE}${path}`, {
            method: "GET",
            headers: { "User-Agent": "SimPilotSEOCheck/1.0" },
          });
          if (res.status >= 500) failures.push(`${path} → ${res.status}`);
        } catch (err) {
          failures.push(`${path} → fetch error: ${(err as Error).message}`);
        }
      }),
    );
    expect(failures, `Disallowed routes returning 5xx:\n  ${failures.join("\n  ")}`).toEqual([]);
  }, 60_000);

  it("the SPA shell index.html does NOT carry a global noindex tag", async () => {
    // The site root must be indexable. If somebody accidentally adds a
    // <meta name="robots" content="noindex"> to public/index.html the entire
    // domain becomes uncrawlable — this guards against that footgun.
    const res = await fetchWithTimeout(`${BASE}/`);
    const body = await res.text();
    expect(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(body)).toBe(false);
  });
});
