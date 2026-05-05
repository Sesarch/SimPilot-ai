/**
 * Route Smoke Test
 *
 * Loads the app's public routes in a headless browser and verifies each one
 * mounts without any runtime errors or warnings originating from app code.
 * Routes that require authentication are expected to redirect to /auth — that
 * redirect itself is treated as a successful render.
 *
 * Failure criteria (strict):
 *   - Any uncaught exception (`pageerror`)
 *   - Any `console.error` not on the narrow ignore list
 *   - Any `console.warn` not on the narrow ignore list
 *   - HTTP status >= 500 for the navigation response
 *
 * Runs against `vite preview` (production bundle) started by Playwright's
 * webServer config when executed via `bun run e2e:smoke`.
 */
import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

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

/**
 * Narrow ignore list — only third-party/browser noise that we cannot control
 * and that does NOT originate from our app code. Keep this list as small as
 * possible. Anything from our own modules, hooks, or components must surface
 * as a failure so regressions are caught.
 */
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  // React DevTools install hint emitted by react-dom in dev/preview.
  /Download the React DevTools/i,
  // Lovable preview iframe badge runtime (injected by hosting, not our code).
  /lovable.*badge/i,
];

/**
 * Patterns that identify a console message as originating from our app code.
 * Used to fail on warnings/errors we authored even if Playwright cannot
 * resolve the source URL precisely.
 */
const APP_SOURCE_PATTERNS: RegExp[] = [/\/src\//, /\/assets\/index-/];

function isIgnored(text: string) {
  return IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text));
}

function fromAppCode(msg: ConsoleMessage) {
  const url = msg.location()?.url ?? "";
  if (!url) return true; // unknown source — be strict, treat as app
  return APP_SOURCE_PATTERNS.some((re) => re.test(url));
}

function attachErrorCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    const text = msg.text();
    if (isIgnored(text)) return;
    if (!fromAppCode(msg)) return;
    if (type === "error") consoleErrors.push(text);
    else consoleWarnings.push(text);
  };
  const onPageError = (err: Error) => {
    pageErrors.push(err.message);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return { consoleErrors, consoleWarnings, pageErrors };
}

function logFailures(route: string, label: string, items: string[]) {
  if (items.length === 0) return;
  // GitHub Actions ::error annotations show in the PR/commit checks UI.
  console.log(`\n::group::❌ ${label} on ${route} (${items.length})`);
  for (const [i, item] of items.entries()) {
    console.log(`::error title=${label} on ${route}::[${i + 1}] ${item}`);
    console.log(`  [${i + 1}] ${item}`);
  }
  console.log("::endgroup::");
}

async function smokeRoute(page: Page, route: string) {
  const { consoleErrors, consoleWarnings, pageErrors } =
    attachErrorCollectors(page);

  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response, `no response for ${route}`).not.toBeNull();
  const status = response!.status();
  if (status >= 500) {
    console.log(`::error title=HTTP ${status} on ${route}::Navigation returned ${status}`);
  }
  expect(status, `bad status for ${route}`).toBeLessThan(500);

  // Wait for the React root to mount.
  try {
    await page.waitForSelector("#root *", { timeout: 10_000 });
  } catch (err) {
    console.log(`::error title=Mount timeout on ${route}::#root never populated within 10s`);
    throw err;
  }

  // Give the SPA a beat to flush initial effects / lazy chunks.
  await page.waitForTimeout(500);

  logFailures(route, "Uncaught exception", pageErrors);
  logFailures(route, "Console error", consoleErrors);
  logFailures(route, "Console warning", consoleWarnings);

  expect(pageErrors, `uncaught exceptions on ${route}`).toEqual([]);
  expect(consoleErrors, `console errors on ${route}`).toEqual([]);
  expect(consoleWarnings, `console warnings on ${route}`).toEqual([]);
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
