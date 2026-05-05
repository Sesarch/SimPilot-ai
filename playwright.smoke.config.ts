/**
 * Standalone Playwright config for the route smoke suite.
 *
 * Builds the production bundle, boots `vite preview`, and runs the
 * route-smoke spec against it. Used by CI (`bun run e2e:smoke`).
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /route-smoke\.spec\.ts/,
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `bunx vite preview --port ${PORT} --host 127.0.0.1`,
    url: `${BASE_URL}/`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
