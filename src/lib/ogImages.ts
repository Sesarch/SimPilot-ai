/**
 * Single source of truth mapping canonical paths → social share image
 * (Open Graph / Twitter card).
 *
 * SEOHead reads this automatically: any page that passes `canonical` and
 * has an entry here will get its dedicated OG image with no extra wiring.
 * Pages may still pass an explicit `ogImage` prop to override.
 *
 * Image conventions:
 *   - Large variant: 1200×630 JPG, < 100 KB → emitted as `og:image`
 *     (Facebook, LinkedIn, Slack, iMessage, Discord all prefer this).
 *   - Small variant:   800×418 JPG, < 50 KB → emitted as `twitter:image`
 *     (Twitter/X `summary_large_image` renders this size natively without
 *     re-encoding, so previews load faster and stay sharper).
 *   - Both live in /public/og-*.jpg so they resolve at https://simpilot.ai/og-*.jpg
 *   - Small variants are auto-generated from the large ones by
 *     `scripts/generate-og-variants.py` — never hand-author them.
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

/** Resolve the large (1200×630) OG image for a canonical path. */
export function resolveOgImage(canonical?: string, override?: string): string {
  if (override) return override;
  if (canonical && OG_IMAGE_BY_PATH[canonical]) return OG_IMAGE_BY_PATH[canonical];
  return DEFAULT_OG_IMAGE;
}

/**
 * Derive the Twitter-sized (800×418) variant path for any large OG image.
 * Convention: `/og-foo.jpg` → `/og-foo-sm.jpg`. Falls back to the large
 * image if no `-sm` variant exists (a missing variant is preferable to
 * emitting a 404 to Twitter's scraper).
 */
export function resolveTwitterImage(canonical?: string, override?: string): string {
  const large = resolveOgImage(canonical, override);
  // Only auto-derive for our own /og-*.jpg images. External overrides are
  // returned as-is so callers stay in control.
  if (!/^\/og-[a-z0-9-]+\.jpg$/i.test(large)) return large;
  return large.replace(/\.jpg$/i, "-sm.jpg");
}
