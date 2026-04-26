/**
 * Single source of truth mapping canonical paths → social share image
 * (Open Graph / Twitter card).
 *
 * SEOHead reads this automatically: any page that passes `canonical` and
 * has an entry here will get its dedicated OG image with no extra wiring.
 * Pages may still pass an explicit `ogImage` prop to override.
 *
 * Image conventions:
 *   - 1200×630 (or 1920×1080 downscaled), JPG, < 100 KB
 *   - Live in /public/og-*.jpg so they resolve at https://simpilot.ai/og-*.jpg
 *   - Referenced as a root-relative path ("/og-foo.jpg")
 */

export const DEFAULT_OG_IMAGE = "/og-image.jpg";

export const OG_IMAGE_BY_PATH: Record<string, string> = {
  "/": "/og-image.jpg",
  "/why-simpilot": "/og-why-simpilot.jpg",
  "/competitors": "/og-competitors.jpg",
  "/for-schools": "/og-for-schools.jpg",
  "/contact": "/og-contact.jpg",
  "/terms": "/og-terms.jpg",
  "/privacy": "/og-privacy.jpg",
  // noIndex pages — still get nice previews when shared in DMs/Slack
  "/auth": "/og-auth.jpg",
  "/dashboard": "/og-dashboard.jpg",
  "/ground-school": "/og-ground-school.jpg",
  "/oral-exam": "/og-oral-exam.jpg",
  "/weather-briefing": "/og-ground-school.jpg",
  "/live-tools": "/og-live-sky.jpg",
  "/session-history": "/og-session-history.jpg",
  "/progress": "/og-progress.jpg",
};

/** Resolve the OG image for a canonical path, falling back to the default. */
export function resolveOgImage(canonical?: string, override?: string): string {
  if (override) return override;
  if (canonical && OG_IMAGE_BY_PATH[canonical]) return OG_IMAGE_BY_PATH[canonical];
  return DEFAULT_OG_IMAGE;
}
