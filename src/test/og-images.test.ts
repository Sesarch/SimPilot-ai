/**
 * OG / Twitter card validation.
 *
 * Two layers:
 *   1. Static (always-on, hermetic):
 *      - Every entry in OG_IMAGE_BY_PATH points to a real file in /public.
 *      - The DEFAULT_OG_IMAGE exists.
 *      - All OG image files are non-empty and look like real images.
 *      - Every public route in the sitemap has an OG image entry.
 *
 *   2. Live (opt-in via RUN_LIVE_SEO_CHECK=1):
 *      - Fetch each route from a running preview server.
 *      - Parse the rendered HTML for required OG/Twitter meta tags.
 *      - HEAD-request each og:image / twitter:image URL and confirm it
 *        returns a 2xx with an image content-type.
 *
 * Run static layer:   bunx vitest run src/test/og-images.test.ts
 * Run full suite:     RUN_LIVE_SEO_CHECK=1 SEO_CHECK_BASE_URL=http://127.0.0.1:4173 \
 *                     bunx vitest run src/test/og-images.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  OG_IMAGE_BY_PATH,
  DEFAULT_OG_IMAGE,
  resolveOgImage,
  resolveTwitterImage,
} from "../lib/ogImages";
import { PUBLIC_ROUTES } from "../../scripts/sitemap-routes";

const PUBLIC_DIR = resolve(__dirname, "../../public");

const REQUIRED_OG_FIELDS = [
  "og:title",
  "og:description",
  "og:type",
  "og:image",
  "og:site_name",
] as const;

const REQUIRED_TWITTER_FIELDS = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
] as const;

// ---------- helpers ----------

function publicPathFor(rootRelative: string): string {
  // rootRelative is like "/og-foo.jpg"
  return resolve(PUBLIC_DIR, rootRelative.replace(/^\//, ""));
}

/** Looks like a JPG/PNG/WebP by magic bytes. */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return true;
  // WebP: "RIFF" .... "WEBP"
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return true;
  return false;
}

function parseMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Match <meta property="..." content="..."> and <meta name="..." content="...">
  // in either attribute order, single or double quotes.
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

// ---------- static (always-on) ----------

describe("OG image registry — static integrity", () => {
  it("default OG image exists and is a real image", () => {
    const p = publicPathFor(DEFAULT_OG_IMAGE);
    expect(existsSync(p), `missing ${DEFAULT_OG_IMAGE}`).toBe(true);
    const buf = readFileSync(p);
    expect(buf.byteLength).toBeGreaterThan(1024);
    expect(looksLikeImage(buf), `${DEFAULT_OG_IMAGE} is not a valid image`).toBe(
      true,
    );
  });

  it.each(Object.entries(OG_IMAGE_BY_PATH))(
    "registry entry %s → %s exists, non-empty, valid image",
    (_route, imagePath) => {
      const p = publicPathFor(imagePath);
      expect(existsSync(p), `missing ${imagePath}`).toBe(true);
      const stats = statSync(p);
      expect(stats.size).toBeGreaterThan(1024);
      const buf = readFileSync(p);
      expect(looksLikeImage(buf), `${imagePath} is not a valid image`).toBe(
        true,
      );
    },
  );

  it("resolveOgImage falls back to DEFAULT_OG_IMAGE for unknown paths", () => {
    expect(resolveOgImage("/this-route-does-not-exist")).toBe(DEFAULT_OG_IMAGE);
  });

  it("resolveOgImage honors explicit override", () => {
    expect(resolveOgImage("/", "/custom.jpg")).toBe("/custom.jpg");
  });

  it("every public sitemap route has a dedicated OG image entry", () => {
    const missing = PUBLIC_ROUTES.map((r) => r.path).filter(
      (p) => !(p in OG_IMAGE_BY_PATH),
    );
    // /cookie-preferences is intentionally allowed to fall back; flag everything else.
    const required = missing.filter((p) => p !== "/cookie-preferences");
    expect(
      required,
      `Public routes without OG image: ${required.join(", ")}`,
    ).toEqual([]);
  });
});

// ---------- live (opt-in) ----------

const LIVE = process.env.RUN_LIVE_SEO_CHECK === "1";
const BASE_URL = (
  process.env.SEO_CHECK_BASE_URL || "http://127.0.0.1:4173"
).replace(/\/$/, "");

describe.skipIf(!LIVE)("OG meta — live rendered pages", () => {
  // Routes we expect to render with full OG metadata. Auth-gated routes are
  // included because SEOHead is rendered before the redirect.
  const ROUTES_TO_CHECK = Object.keys(OG_IMAGE_BY_PATH);

  it.each(ROUTES_TO_CHECK)(
    "%s exposes all required OG/Twitter fields and image is reachable",
    async (route) => {
      const url = `${BASE_URL}${route}`;
      const res = await fetch(url, {
        headers: {
          // Render as a social crawler to defeat any client-only guards.
          "User-Agent": "facebookexternalhit/1.1",
        },
      });
      expect(res.status, `GET ${url}`).toBeLessThan(400);
      const html = await res.text();
      const meta = parseMetaTags(html);

      // Allow a brief retry window in case Helmet hasn't flushed in dev mode.
      // (vite preview serves the built bundle so this is normally instant.)

      for (const field of REQUIRED_OG_FIELDS) {
        expect(meta[field], `${route} missing ${field}`).toBeTruthy();
      }
      for (const field of REQUIRED_TWITTER_FIELDS) {
        expect(meta[field], `${route} missing ${field}`).toBeTruthy();
      }

      // og:image and twitter:image should resolve to a reachable image.
      const ogImage = meta["og:image"];
      const twImage = meta["twitter:image"];
      expect(ogImage).toMatch(/^https?:\/\//);
      expect(twImage).toMatch(/^https?:\/\//);

      for (const imgUrl of new Set([ogImage, twImage])) {
        // HEAD first; some CDNs reject HEAD, so fall back to ranged GET.
        let imgRes = await fetch(imgUrl, { method: "HEAD" });
        if (imgRes.status === 405 || imgRes.status === 403) {
          imgRes = await fetch(imgUrl, {
            method: "GET",
            headers: { Range: "bytes=0-1023" },
          });
        }
        expect(
          imgRes.status,
          `image not reachable for ${route}: ${imgUrl}`,
        ).toBeLessThan(400);
        const ct = imgRes.headers.get("content-type") || "";
        expect(
          ct.startsWith("image/"),
          `image content-type for ${imgUrl} is "${ct}"`,
        ).toBe(true);
      }
    },
    20_000,
  );
});
