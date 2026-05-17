/**
 * SAFEGUARD — Project Domain Allowlist
 *
 * This project (SimPilot) is permanently bound to the `simpilot.ai` domain
 * family. It must NEVER reference, send from, or link to any other Lovable
 * workspace project's domain (mainai.pro, ezapps.app, scanify.pro, etc.).
 *
 * This test scans the repository for forbidden domain literals and fails
 * the build if any are introduced. If a legitimate need for a new domain
 * arises, the allowlist below is the single place to update — and any such
 * change should be reviewed deliberately.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// Domains owned by the same Lovable workspace that MUST NOT appear in this
// project's code, configs, or edge functions.
const FORBIDDEN_DOMAINS = ["mainai.pro", "ezapps.app", "scanify.pro"];

// Paths to exclude from the scan. This very test file is excluded so the
// allowlist literals themselves don't trigger a false positive.
const EXCLUDES = [
  "node_modules",
  "dist",
  ".git",
  "build",
  ".next",
  "src/test/domain-allowlist.test.ts",
];

describe("Project domain safeguard", () => {
  for (const domain of FORBIDDEN_DOMAINS) {
    it(`must not reference foreign workspace domain: ${domain}`, () => {
      const excludeArgs = EXCLUDES.map((p) => `-g '!${p}'`).join(" ");
      let matches = "";
      try {
        matches = execSync(
          `rg -iuu --hidden ${excludeArgs} -l '${domain}' . || true`,
          { encoding: "utf8", cwd: process.cwd() },
        ).trim();
      } catch {
        matches = "";
      }
      expect(
        matches,
        `Forbidden domain "${domain}" found in:\n${matches}\n\n` +
          `This project is bound to simpilot.ai only. Remove the reference ` +
          `or, if intentional, update src/test/domain-allowlist.test.ts.`,
      ).toBe("");
    });
  }

  it("simpilot.ai allowlist sanity check", () => {
    // Positive control: ensure the canonical domain is still present somewhere.
    const found = execSync(
      `rg -iuu --hidden -g '!node_modules' -g '!dist' -g '!.git' -l 'simpilot\\.ai' . || true`,
      { encoding: "utf8", cwd: process.cwd() },
    ).trim();
    expect(found.length).toBeGreaterThan(0);
  });
});
