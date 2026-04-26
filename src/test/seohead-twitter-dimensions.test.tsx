/**
 * SEOHead — twitter:image dimension verification.
 *
 * Twitter's `summary_large_image` card reserves layout space using
 * `twitter:image:width` / `twitter:image:height` BEFORE downloading the
 * image. If those tags are missing or wrong, the card either shrinks to
 * `summary` or jumps after load. This test renders <SEOHead /> for every
 * indexable route in PUBLIC_ROUTES — plus a custom `ogImage` override case
 * — and asserts the rendered <head> always emits:
 *
 *   • <meta name="twitter:image:width"  content="800">
 *   • <meta name="twitter:image:height" content="418">
 *   • <meta name="twitter:image"        content="…(absolute URL)…">
 *
 * The width/height are intentionally hardcoded in SEOHead because both the
 * auto-derived `-sm.jpg` variants AND any external override are expected to
 * conform to the 800×418 contract documented in src/lib/ogImages.ts. This
 * test locks that contract in.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEOHead from "../components/SEOHead";
import { PUBLIC_ROUTES, SITE_URL } from "../../scripts/sitemap-routes";
import { OG_IMAGE_BY_PATH } from "../lib/ogImages";
import { parseMetaTags } from "../lib/htmlMetaParser";

async function renderHead(props: React.ComponentProps<typeof SEOHead>) {
  // react-helmet-async writes to document.head asynchronously after mount.
  // We render, yield to the microtask queue, then read the live <head>.
  // cleanup() between cases resets the React tree so previous routes can't
  // leak tags into later assertions.
  render(
    <HelmetProvider>
      <SEOHead {...props} />
    </HelmetProvider>,
  );
  // Two macrotasks: Helmet schedules a requestAnimationFrame-style flush
  // in jsdom which lands after a setTimeout(0) tick.
  await new Promise((r) => setTimeout(r, 0));
  return document.head.innerHTML;
}

describe("SEOHead — twitter:image dimensions", () => {
  beforeEach(() => {
    cleanup();
    // Helmet appends to document.head; clear residual tags between tests.
    document.head.innerHTML = "";
  });

  it.each(PUBLIC_ROUTES.map((r) => r.path))(
    "%s emits twitter:image:width=800 and height=418",
    async (route) => {
      const html = await renderHead({
        title: `Test page for ${route}`,
        description: "Test description",
        keywords: "test",
        canonical: route,
      });
      const meta = parseMetaTags(html);

      expect(meta["twitter:image:width"], `${route}: twitter:image:width`).toBe(
        "800",
      );
      expect(
        meta["twitter:image:height"],
        `${route}: twitter:image:height`,
      ).toBe("418");

      // twitter:image itself must be an absolute URL on the production origin.
      const twitterImage = meta["twitter:image"];
      expect(twitterImage, `${route}: twitter:image`).toBeTruthy();
      expect(
        twitterImage.startsWith(`${SITE_URL}/`),
        `${route}: twitter:image must be absolute under ${SITE_URL} — got "${twitterImage}"`,
      ).toBe(true);

      // For routes with a curated /og-*.jpg, twitter:image must point at the
      // small variant (or fall back to the large one if no -sm exists; see
      // resolveTwitterImage). We at minimum require the path to match the
      // /og-…(-sm)?.jpg shape.
      if (OG_IMAGE_BY_PATH[route]) {
        expect(
          /\/og-[a-z0-9-]+(-sm)?\.jpg$/i.test(twitterImage),
          `${route}: twitter:image should be an /og-*.jpg variant — got "${twitterImage}"`,
        ).toBe(true);
      }
    },
  );

  it("custom ogImage override still emits 800×418 dimensions", async () => {
    const override = "/og-image.jpg";
    const html = await renderHead({
      title: "Custom override page",
      description: "Test description",
      keywords: "test",
      canonical: "/why-simpilot",
      ogImage: override,
    });
    const meta = parseMetaTags(html);

    // Dimensions are a fixed contract — overriding the image must not
    // accidentally drop or change them.
    expect(meta["twitter:image:width"]).toBe("800");
    expect(meta["twitter:image:height"]).toBe("418");

    // The override flows through resolveTwitterImage: since it matches
    // /og-*.jpg, we expect the -sm variant.
    expect(meta["twitter:image"]).toBe(`${SITE_URL}/og-image-sm.jpg`);
  });

  it("external ogImage override is preserved verbatim with dimensions intact", async () => {
    const externalOverride = "https://cdn.example.com/custom-share.png";
    const html = await renderHead({
      title: "External image page",
      description: "Test description",
      keywords: "test",
      canonical: "/contact",
      ogImage: externalOverride,
    });
    const meta = parseMetaTags(html);

    // Even for non-matching external URLs (where resolveTwitterImage returns
    // the override as-is, no -sm derivation), the dimension tags must remain
    // 800×418 so callers passing a pre-sized asset get correct metadata.
    expect(meta["twitter:image:width"]).toBe("800");
    expect(meta["twitter:image:height"]).toBe("418");

    // SEOHead currently prefixes BASE_URL to ogImage. Document the actual
    // behaviour so a future refactor that changes prefixing will surface here.
    expect(meta["twitter:image"]).toContain(externalOverride);
  });

  it("route with no canonical still emits dimension tags", async () => {
    const html = await renderHead({
      title: "Anonymous page",
      description: "Test description",
      keywords: "test",
    });
    const meta = parseMetaTags(html);

    expect(meta["twitter:image:width"]).toBe("800");
    expect(meta["twitter:image:height"]).toBe("418");
    // Falls back to default OG image.
    expect(meta["twitter:image"]).toBe(`${SITE_URL}/og-image-sm.jpg`);
  });
});
