/**
 * Playwright config for the pricing-badge visual checks.
 *
 * Builds the production bundle, boots `vite preview`, and asserts the
 * "Most Popular" badge layout across common viewport sizes.
 * Run via `bun run e2e:pricing-badge`.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /pricing-badge\.spec\.ts/,
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bunx vite preview --port ${PORT} --host 127.0.0.1`,
    url: `${BASE_URL}/`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
