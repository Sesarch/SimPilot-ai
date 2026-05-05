/**
 * Route Smoke Test
 *
 * Loads the app's public routes in a headless browser and verifies each one
 * mounts without any runtime errors (uncaught exceptions, console errors, or
 * failed page loads). Routes that require authentication are expected to
 * redirect to /auth — that redirect itself is treated as a successful render.
 *
 * Runs against `vite preview` (production bundle) started by Playwright's
 * webServer config when executed via `bun run e2e:smoke`.
 */
import { test, expect } from "../playwright-fixture";
import type { ConsoleMessage, Page } from "@playwright/test";

// Public routes — should render without redirect.
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/cookie-preferences",
  "/contact",
  "/why-simpilot",
  "/competitors",
  "/for-schools",
  "/intake",
  "/unsubscribe",
];

// Auth-gated routes — the dashboard layout will redirect to /auth.
// We just verify no runtime errors during the redirect path.
const GATED_ROUTES = [
  "/dashboard",
  "/ground-school",
  "/oral-exam",
  "/weather-briefing",
  "/live-tools",
  "/quick-answer",
  "/logbook",
  "/test-mode",
];

// Console messages we deliberately tolerate (third-party noise, dev warnings
// that are harmless in the production preview build).
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /Lovable.*badge/i,
  /favicon/i,
  /sourcemap/i,
];

function isIgnored(text: string) {
  return IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text));
}

function attachErrorCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isIgnored(text)) return;
    consoleErrors.push(text);
  };
  const onPageError = (err: Error) => {
    if (isIgnored(err.message)) return;
    pageErrors.push(err.message);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return { consoleErrors, pageErrors };
}

async function smokeRoute(page: Page, route: string) {
  const { consoleErrors, pageErrors } = attachErrorCollectors(page);

  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response, `no response for ${route}`).not.toBeNull();
  expect(response!.status(), `bad status for ${route}`).toBeLessThan(500);

  // Wait for the React root to mount.
  await page.waitForSelector("#root *", { timeout: 10_000 });

  // Give the SPA a beat to flush initial effects / lazy chunks.
  await page.waitForTimeout(500);

  expect(pageErrors, `uncaught exceptions on ${route}`).toEqual([]);
  expect(consoleErrors, `console errors on ${route}`).toEqual([]);
}

test.describe("Route smoke — public", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      await smokeRoute(page, route);
    });
  }
});

test.describe("Route smoke — auth-gated (redirects cleanly)", () => {
  for (const route of GATED_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      await smokeRoute(page, route);
    });
  }
});
