/**
 * Sitemap drift guard.
 *
 * Fails when a route declared in src/App.tsx is neither:
 *   - listed in scripts/sitemap-routes.ts (public, indexable), NOR
 *   - blocked in public/robots.txt (private, non-indexable).
 *
 * This forces every new route to be intentionally classified, so the
 * sitemap stays in sync as the router grows.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PUBLIC_ROUTES } from "../../scripts/sitemap-routes";

const root = resolve(__dirname, "../..");

function extractAppRoutes(): string[] {
  const src = readFileSync(resolve(root, "src/App.tsx"), "utf8");
  const routes = new Set<string>();
  // Match: <Route path="/foo" or <Route path="/foo/bar"
  const re = /<Route\s+path=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const p = m[1];
    if (p === "*") continue; // 404 catch-all
    // Strip dynamic segments for robots/sitemap matching
    routes.add(p);
  }
  return [...routes];
}

function extractRobotsDisallow(): string[] {
  const src = readFileSync(resolve(root, "public/robots.txt"), "utf8");
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.toLowerCase().startsWith("disallow:"))
    .map((l) => l.slice("disallow:".length).trim())
    .filter(Boolean);
}

function isCoveredByDisallow(route: string, disallows: string[]): boolean {
  return disallows.some((d) => {
    if (d === route) return true;
    // Trailing-slash style: "/pilot/" should cover "/pilot/:userId"
    if (d.endsWith("/") && route.startsWith(d)) return true;
    // Treat "/flight-deck" as covering "/flight-deck/bridge"
    if (route === d || route.startsWith(d + "/")) return true;
    return false;
  });
}

describe("sitemap coverage", () => {
  const appRoutes = extractAppRoutes();
  const sitemapPaths = new Set(PUBLIC_ROUTES.map((r) => r.path));
  const disallows = extractRobotsDisallow();

  it("every App.tsx route is either in the sitemap or robots disallow", () => {
    const uncovered = appRoutes.filter(
      (r) => !sitemapPaths.has(r) && !isCoveredByDisallow(r, disallows),
    );
    expect(
      uncovered,
      `Uncovered routes — add to scripts/sitemap-routes.ts (public) or public/robots.txt (private):\n  ${uncovered.join("\n  ")}`,
    ).toEqual([]);
  });

  it("sitemap entries reference routes that exist in App.tsx", () => {
    const stale = [...sitemapPaths].filter((p) => !appRoutes.includes(p));
    expect(stale, `Sitemap references routes not defined in App.tsx:\n  ${stale.join("\n  ")}`).toEqual([]);
  });

  it("robots disallow entries reference routes that exist in App.tsx", () => {
    const stale = disallows.filter(
      (d) => !appRoutes.some((r) => r === d || r.startsWith(d.endsWith("/") ? d : d + "/")),
    );
    expect(stale, `robots.txt disallows routes not defined in App.tsx:\n  ${stale.join("\n  ")}`).toEqual([]);
  });
});
