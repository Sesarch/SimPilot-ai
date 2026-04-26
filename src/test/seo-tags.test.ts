/**
 * Per-route SEO tag verification — live check.
 *
 * For every indexable route in PUBLIC_ROUTES, this test fetches the rendered
 * HTML from a running preview server (as a social crawler) and asserts that
 * the page exposes correctly-formed:
 *
 *   • <link rel="canonical" href="…">          — required, absolute https://,
 *                                                must point at the same path
 *                                                we requested (no surprise
 *                                                redirects).
 *   • <meta property="og:image" content="…">   — required, absolute URL,
 *                                                resolves with image/* MIME.
 *   • <meta property="og:url" content="…">     — required, must equal canonical.
 *   • <meta name="twitter:card" content="…">   — required, must be one of the
 *                                                supported values.
 *   • <meta name="twitter:image" content="…">  — required, absolute URL.
 *
 * Hermetic by default. Runs only when RUN_LIVE_SEO_CHECK=1 with a preview
 * server reachable at SEO_CHECK_BASE_URL (defaults to http://127.0.0.1:4173).
 *
 * This complements seo-live-check.test.ts (which validates robots/sitemap
 * routing) and og-images.test.ts (which focuses on the OG image registry).
 */

import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES, SITE_URL } from "../../scripts/sitemap-routes";

const LIVE = process.env.RUN_LIVE_SEO_CHECK === "1";
const BASE_URL = (
  process.env.SEO_CHECK_BASE_URL || "http://127.0.0.1:4173"
).replace(/\/$/, "");

const VALID_TWITTER_CARDS = new Set([
  "summary",
  "summary_large_image",
  "app",
  "player",
]);

function parseMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re =
    /<meta\b[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  const re2 =
    /<meta\b[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out[m[1].toLowerCase()] = m[2];
  while ((m = re2.exec(html))) {
    const key = m[2].toLowerCase();
    if (!(key in out)) out[key] = m[1];
  }
  return out;
}

function parseCanonical(html: string): string | null {
  // Match <link rel="canonical" href="…"> in either attribute order.
  const re1 =
    /<link\b[^>]*?rel\s*=\s*["']canonical["'][^>]*?href\s*=\s*["']([^"']+)["'][^>]*>/i;
  const re2 =
    /<link\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?rel\s*=\s*["']canonical["'][^>]*>/i;
  return html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? null;
}

async function fetchAsCrawler(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "facebookexternalhit/1.1" },
    redirect: "follow",
  });
  expect(res.status, `GET ${url} → ${res.status}`).toBeLessThan(400);
  return res.text();
}

async function imageReachable(url: string, route: string): Promise<void> {
  let res = await fetch(url, { method: "HEAD" });
  if (res.status === 405 || res.status === 403) {
    res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1023" },
    });
  }
  expect(
    res.status,
    `image not reachable for ${route}: ${url} → ${res.status}`,
  ).toBeLessThan(400);
  const ct = res.headers.get("content-type") || "";
  expect(
    ct.startsWith("image/"),
    `image content-type for ${url} is "${ct}"`,
  ).toBe(true);
}

describe.skipIf(!LIVE)(
  "Per-route SEO tags (canonical / og:image / twitter:card)",
  () => {
    it.each(PUBLIC_ROUTES.map((r) => r.path))(
      "%s exposes canonical + og:image + twitter:card",
      async (route) => {
        const html = await fetchAsCrawler(`${BASE_URL}${route}`);
        const meta = parseMetaTags(html);

        // ---------- canonical ----------
        const canonical = parseCanonical(html);
        expect(canonical, `${route}: missing <link rel="canonical">`).toBeTruthy();
        expect(
          canonical!.startsWith("https://"),
          `${route}: canonical must be absolute https — got "${canonical}"`,
        ).toBe(true);

        // Canonical path must match the route. Allow trailing-slash drift,
        // and allow "/" canonical when the route itself is "/".
        const canonicalPath = new URL(canonical!).pathname.replace(/\/$/, "") || "/";
        const expectedPath = route.replace(/\/$/, "") || "/";
        expect(
          canonicalPath,
          `${route}: canonical path mismatch ("${canonicalPath}" vs expected "${expectedPath}")`,
        ).toBe(expectedPath);

        // Canonical should point at the production origin, not the preview.
        expect(
          canonical!.startsWith(SITE_URL),
          `${route}: canonical should point at ${SITE_URL} — got "${canonical}"`,
        ).toBe(true);

        // ---------- og:image ----------
        const ogImage = meta["og:image"];
        expect(ogImage, `${route}: missing og:image`).toBeTruthy();
        expect(
          /^https?:\/\//.test(ogImage),
          `${route}: og:image must be absolute — got "${ogImage}"`,
        ).toBe(true);
        await imageReachable(ogImage, route);

        // ---------- og:url should equal canonical ----------
        const ogUrl = meta["og:url"];
        if (ogUrl) {
          expect(
            ogUrl,
            `${route}: og:url should equal canonical`,
          ).toBe(canonical);
        }

        // ---------- twitter:card ----------
        const twitterCard = meta["twitter:card"];
        expect(twitterCard, `${route}: missing twitter:card`).toBeTruthy();
        expect(
          VALID_TWITTER_CARDS.has(twitterCard),
          `${route}: twitter:card "${twitterCard}" is not a recognised value`,
        ).toBe(true);

        // ---------- twitter:image ----------
        const twitterImage = meta["twitter:image"];
        expect(twitterImage, `${route}: missing twitter:image`).toBeTruthy();
        expect(
          /^https?:\/\//.test(twitterImage),
          `${route}: twitter:image must be absolute — got "${twitterImage}"`,
        ).toBe(true);
        // twitter:image is also reachable (skip duplicate fetch if same as og).
        if (twitterImage !== ogImage) {
          await imageReachable(twitterImage, route);
        }

        // ---------- image dimension metadata ----------
        // These accelerate first-render of social previews (scrapers can
        // reserve layout space without downloading the image first) and let
        // platforms reject mis-sized assets cleanly. Required on every route.
        expect(meta["og:image:width"], `${route}: missing og:image:width`).toBe("1200");
        expect(meta["og:image:height"], `${route}: missing og:image:height`).toBe("630");
        expect(
          meta["twitter:image:width"],
          `${route}: missing twitter:image:width`,
        ).toBe("800");
        expect(
          meta["twitter:image:height"],
          `${route}: missing twitter:image:height`,
        ).toBe("418");
      },
      20_000,
    );
  },
);
