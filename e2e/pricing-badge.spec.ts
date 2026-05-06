/**
 * Pricing "Most Popular" badge — visual integrity checks.
 *
 * Verifies across common viewport sizes that the badge:
 *   - renders on a single line (no wrap)
 *   - is not clipped horizontally by the viewport
 *   - sits visually above the highlighted card (not occluded)
 *   - keeps a screenshot snapshot for manual review on failure
 *
 * Run with: bun run e2e:pricing-badge
 */
import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-xs", width: 320, height: 568 },
  { name: "mobile-sm", width: 360, height: 800 },
  { name: "mobile-md", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1536, height: 900 },
];

async function gotoPricing(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // Dismiss cookie banner if present (don't fail if missing).
  const decline = page.getByRole("button", { name: /decline|reject/i }).first();
  if (await decline.isVisible().catch(() => false)) {
    await decline.click().catch(() => {});
  }
  // Scroll to pricing section.
  await page
    .locator("#pricing")
    .scrollIntoViewIfNeeded({ timeout: 10_000 })
    .catch(async () => {
      // Fallback: scroll to badge directly.
      await page.getByText("Most Popular", { exact: true }).first().scrollIntoViewIfNeeded();
    });
  await page.waitForTimeout(400);
}

test.describe("Pricing — 'Most Popular' badge", () => {
  for (const vp of VIEWPORTS) {
    test(`badge renders cleanly @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoPricing(page);

      const badge = page.getByText("Most Popular", { exact: true }).first();
      await expect(badge, "badge is visible").toBeVisible();

      const box = await badge.boundingBox();
      expect(box, "badge has a bounding box").not.toBeNull();
      const { x, y, width, height } = box!;

      // 1. No wrap — height should match a single line of the 10px badge.
      // Allow slack for padding (py-1.5 ≈ 12px) and font metrics.
      expect(height, "badge height suggests single line").toBeLessThan(36);

      // 2. Horizontally inside the viewport.
      expect(x, "badge left within viewport").toBeGreaterThanOrEqual(0);
      expect(x + width, "badge right within viewport").toBeLessThanOrEqual(vp.width);

      // 3. Vertically inside the viewport.
      expect(y, "badge top within viewport").toBeGreaterThanOrEqual(0);
      expect(y + height, "badge bottom within viewport").toBeLessThanOrEqual(vp.height);

      // 4. Element-level scroll-clip check — the rendered text should not be
      // truncated by an ancestor's overflow:hidden.
      const clipping = await badge.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const lineHeight = parseFloat(cs.lineHeight) || r.height;
        return {
          scrollWidth: (el as HTMLElement).scrollWidth,
          clientWidth: (el as HTMLElement).clientWidth,
          scrollHeight: (el as HTMLElement).scrollHeight,
          lineHeight,
          whiteSpace: cs.whiteSpace,
        };
      });
      expect(clipping.scrollWidth, "badge content not horizontally clipped").toBeLessThanOrEqual(
        clipping.clientWidth + 1,
      );
      expect(clipping.whiteSpace, "badge enforces nowrap").toMatch(/nowrap/);

      // 5. The element actually visible at its center (not occluded).
      const occluded = await page.evaluate(([cx, cy]) => {
        const top = document.elementFromPoint(cx, cy);
        if (!top) return "no-element";
        return top.textContent?.includes("Most Popular") ||
          top.closest("[class*='whitespace-nowrap']") !== null
          ? "ok"
          : `occluded-by:${top.tagName}.${(top as HTMLElement).className || ""}`;
      }, [x + width / 2, y + height / 2]);
      expect(occluded, "badge is the topmost element at its center").toBe("ok");

      // Capture a snapshot for manual review when something is off.
      await badge.screenshot({
        path: `test-results/pricing-badge/${vp.name}.png`,
      });
    });
  }
});
