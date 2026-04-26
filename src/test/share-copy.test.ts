/**
 * Static integrity tests for the per-route social-share copy registry.
 *
 * Live verification (that the rendered HTML actually carries this copy) lives
 * in src/test/seo-tags.test.ts behind RUN_LIVE_SEO_CHECK=1.
 */

import { describe, it, expect } from "vitest";
import {
  SHARE_COPY_BY_PATH,
  DEFAULT_SHARE_COPY,
  SHARE_TITLE_MAX,
  SHARE_DESCRIPTION_MAX,
  resolveShareCopy,
  validateShareCopy,
} from "../lib/shareCopy";
import { PUBLIC_ROUTES } from "../../scripts/sitemap-routes";

describe("share copy registry", () => {
  it("default copy is non-empty and within length caps", () => {
    expect(validateShareCopy(DEFAULT_SHARE_COPY)).toEqual([]);
  });

  it.each(Object.entries(SHARE_COPY_BY_PATH))(
    "%s copy is within length caps and non-empty",
    (_route, copy) => {
      const issues = validateShareCopy(copy);
      expect(issues, `Issues: ${issues.join("; ")}`).toEqual([]);
    },
  );

  it("every public sitemap route has a curated share-copy entry", () => {
    const missing = PUBLIC_ROUTES.map((r) => r.path).filter(
      (p) => !(p in SHARE_COPY_BY_PATH),
    );
    // /cookie-preferences and /for-schools/success are deliberately allowed
    // to fall back to the default — they're transactional, not shareable.
    const allowedFallbacks = new Set(["/cookie-preferences", "/for-schools/success"]);
    const required = missing.filter((p) => !allowedFallbacks.has(p));
    expect(
      required,
      `Public routes missing curated share copy: ${required.join(", ")}`,
    ).toEqual([]);
  });

  it("title cap is enforced: 71-char titles fail validation", () => {
    const issues = validateShareCopy({
      title: "x".repeat(SHARE_TITLE_MAX + 1),
      description: "ok",
    });
    expect(issues.some((i) => i.includes("title"))).toBe(true);
  });

  it("description cap is enforced", () => {
    const issues = validateShareCopy({
      title: "ok",
      description: "x".repeat(SHARE_DESCRIPTION_MAX + 1),
    });
    expect(issues.some((i) => i.includes("description"))).toBe(true);
  });
});

describe("resolveShareCopy precedence", () => {
  it("explicit overrides win over registry and fallback", () => {
    const out = resolveShareCopy({
      canonical: "/",
      overrideTitle: "Override T",
      overrideDescription: "Override D",
      fallbackTitle: "fb T",
      fallbackDescription: "fb D",
    });
    expect(out.title).toBe("Override T");
    expect(out.description).toBe("Override D");
    expect(out.fromRegistry).toBe(true);
  });

  it("registry wins over fallback when no override is given", () => {
    const out = resolveShareCopy({
      canonical: "/",
      fallbackTitle: "fb T",
      fallbackDescription: "fb D",
    });
    expect(out.title).toBe(SHARE_COPY_BY_PATH["/"].title);
    expect(out.description).toBe(SHARE_COPY_BY_PATH["/"].description);
    expect(out.fromRegistry).toBe(true);
  });

  it("falls back to SEO copy for routes with no registry entry", () => {
    const out = resolveShareCopy({
      canonical: "/route-that-does-not-exist",
      fallbackTitle: "fb T",
      fallbackDescription: "fb D",
    });
    expect(out.title).toBe("fb T");
    expect(out.description).toBe("fb D");
    expect(out.fromRegistry).toBe(false);
  });

  it("works without a canonical (uses fallback)", () => {
    const out = resolveShareCopy({
      fallbackTitle: "fb T",
      fallbackDescription: "fb D",
    });
    expect(out.title).toBe("fb T");
    expect(out.fromRegistry).toBe(false);
  });
});
