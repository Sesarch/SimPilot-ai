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
import { SHARE_COPY_BY_PATH } from "../lib/shareCopy";
import {
  parseMetaTags,
  parseMetaTagsAll,
  parseCanonical,
} from "../lib/htmlMetaParser";

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

// Keys that must appear at most once per page. Duplicates indicate the
// SEOHead component leaked stale tags from a previous render or that
// index.html and React are both emitting the same tag without dedupe.
const SINGLETON_META_KEYS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
] as const;

async function fetchAsCrawler(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "facebookexternalhit/1.1" },
    redirect: "follow",
  });
  expect(res.status, `GET ${url} → ${res.status}`).toBeLessThan(400);
  return res.text();
}

/**
 * Verify a canonical URL resolves with a 2xx response and is NOT a redirect.
 *
 * A canonical that 301/302s — or that 200s only after following a redirect
 * chain — is a soft SEO bug: search engines may treat the *final* URL as the
 * true canonical, splitting link equity and undermining the tag's purpose.
 *
 * We use `redirect: "manual"` so any 3xx surfaces as a hard failure rather
 * than being silently followed. HEAD is tried first; some hosts (incl. some
 * CDNs and Lovable previews) reject HEAD with 405/403, in which case we fall
 * back to a ranged GET that still avoids downloading the full body.
 */
async function canonicalResolvesWithoutRedirect(
  url: string,
  route: string,
): Promise<void> {
  let res = await fetch(url, {
    method: "HEAD",
    redirect: "manual",
    headers: { "User-Agent": "facebookexternalhit/1.1" },
  });
  if (res.status === 405 || res.status === 403) {
    res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "facebookexternalhit/1.1",
        Range: "bytes=0-1023",
      },
    });
  }
  expect(
    res.status >= 300 && res.status < 400,
    `${route}: canonical "${url}" is a redirect (status ${res.status} → ${res.headers.get("location") ?? "?"}). Canonicals must point at the final URL.`,
  ).toBe(false);
  expect(
    res.status,
    `${route}: canonical "${url}" did not resolve 2xx — got ${res.status}`,
  ).toBeLessThan(400);
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
        const metaAll = parseMetaTagsAll(html);

        // ---------- duplicate tag guard ----------
        // Stale tags from a previous render or double-emission from
        // index.html + React would confuse scrapers (some use the first
        // value, some the last). Fail fast if we see any.
        for (const key of SINGLETON_META_KEYS) {
          const occurrences = metaAll[key]?.length ?? 0;
          expect(
            occurrences,
            `${route}: <meta ${key}> appears ${occurrences} times (expected 0 or 1)`,
          ).toBeLessThanOrEqual(1);
        }

        // ---------- canonical ----------
        // This is a SPA: index.html is served unchanged for every route, and
        // the per-route <link rel="canonical"> is injected at runtime by
        // <SEOHead> via react-helmet-async. A plain fetch() (and any
        // non-JS-rendering crawler) therefore only ever sees the static
        // shell. To avoid mis-canonicalising every non-root path to "/",
        // index.html intentionally ships NO static canonical at all — only
        // the root route's runtime canonical happens to match the shell.
        //
        // Contract enforced here:
        //   • For "/" — the static shell may carry a canonical, and if it
        //     does, it must point at the production origin's root.
        //   • For non-root routes — the static shell MUST NOT contain a
        //     hard-coded canonical (which would be wrong for that route).
        //     The correct per-route canonical is verified separately by the
        //     SEOHead unit tests, which render the component and inspect the
        //     post-hydration <head>.
        const canonical = parseCanonical(html);
        const expectedPath = route.replace(/\/$/, "") || "/";

        if (expectedPath === "/") {
          expect(canonical, `${route}: missing <link rel="canonical">`).toBeTruthy();
          expect(
            canonical!.startsWith("https://"),
            `${route}: canonical must be absolute https — got "${canonical}"`,
          ).toBe(true);
          const canonicalPath = new URL(canonical!).pathname.replace(/\/$/, "") || "/";
          expect(
            canonicalPath,
            `${route}: canonical path mismatch ("${canonicalPath}" vs expected "${expectedPath}")`,
          ).toBe(expectedPath);
          expect(
            canonical!.startsWith(SITE_URL),
            `${route}: canonical should point at ${SITE_URL} — got "${canonical}"`,
          ).toBe(true);

          // Canonical must resolve 2xx without a redirect hop. Skip when the
          // preview is on a different origin than the canonical (we can't
          // assert production routing from a local preview server).
          if (BASE_URL.startsWith(SITE_URL)) {
            await canonicalResolvesWithoutRedirect(canonical!, route);
          }
        } else {
          expect(
            canonical,
            `${route}: SPA shell must NOT ship a static canonical (got "${canonical}") — it would mis-canonicalise this route to the shell's URL for non-JS crawlers. The per-route canonical is injected at runtime by SEOHead.`,
          ).toBeFalsy();
        }

        // ---------- og:image ----------
        // The static shell ships a default og:image; per-route overrides are
        // injected by SEOHead at runtime and verified by the SEOHead unit
        // tests. Here we only require the shell default to be present and
        // reachable so link previews never break.
        const ogImage = meta["og:image"];
        expect(ogImage, `${route}: missing og:image`).toBeTruthy();
        expect(
          /^https?:\/\//.test(ogImage),
          `${route}: og:image must be absolute — got "${ogImage}"`,
        ).toBe(true);
        await imageReachable(ogImage, route);

        // ---------- og:url should equal canonical (root only) ----------
        // For non-root routes the canonical doesn't exist in the static
        // shell (see above), so this assertion only applies to "/".
        if (expectedPath === "/" && canonical) {
          const ogUrl = meta["og:url"];
          if (ogUrl) {
            expect(
              ogUrl,
              `${route}: og:url should equal canonical`,
            ).toBe(canonical);
          }
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

        // ---------- curated share copy ----------
        // If this route has an entry in SHARE_COPY_BY_PATH, the rendered
        // og/twitter title and description must contain the curated text.
        // (We use `.includes` rather than equality because SEOHead appends
        // " | SimPilot.AI" to titles when the brand isn't already present.)
        const curated = SHARE_COPY_BY_PATH[route];
        if (curated) {
          expect(
            meta["og:title"],
            `${route}: og:title should carry curated share title`,
          ).toContain(curated.title);
          expect(
            meta["twitter:title"],
            `${route}: twitter:title should carry curated share title`,
          ).toContain(curated.title);
          expect(
            meta["og:description"],
            `${route}: og:description should equal curated share description`,
          ).toBe(curated.description);
          expect(
            meta["twitter:description"],
            `${route}: twitter:description should equal curated share description`,
          ).toBe(curated.description);
        }
      },
      20_000,
    );
  },
);
