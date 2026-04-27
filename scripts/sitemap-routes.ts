/**
 * Single source of truth for sitemap generation.
 * Add public, indexable routes here. Auth-gated routes MUST be excluded
 * (they are also blocked in robots.txt and marked noIndex via SEOHead).
 */
export type SitemapRoute = {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  image?: { loc: string; title: string; caption: string };
};

export const SITE_URL = "https://simpilot.ai";

export const PUBLIC_ROUTES: SitemapRoute[] = [
  {
    path: "/",
    changefreq: "weekly",
    priority: 1.0,
    image: {
      loc: `${SITE_URL}/og-image.png`,
      title: "SimPilot.AI — AI-Powered Pilot Training Platform",
      caption: "Interactive AI CFI for ground school and oral exam preparation",
    },
  },
  {
    path: "/why-simpilot",
    changefreq: "weekly",
    priority: 0.9,
    image: {
      loc: `${SITE_URL}/og-image.png`,
      title: "Why SimPilot.AI — Interactive Demo",
      caption: "Try our Socratic AI instructor with real-time chart analysis",
    },
  },
  {
    path: "/competitors",
    changefreq: "monthly",
    priority: 0.8,
    image: {
      loc: `${SITE_URL}/og-image.png`,
      title: "SimPilot.AI vs Sporty's, King Schools & More",
      caption: "Compare AI-powered pilot training with traditional ground school options",
    },
  },
  { path: "/for-schools", changefreq: "monthly", priority: 0.8 },
  { path: "/intake", changefreq: "monthly", priority: 0.8 },
  { path: "/contact", changefreq: "monthly", priority: 0.7 },
  { path: "/terms", changefreq: "yearly", priority: 0.3 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 },
  { path: "/cookie-preferences", changefreq: "yearly", priority: 0.2 },
];

export function buildSitemapXml(routes: SitemapRoute[], today = new Date().toISOString().slice(0, 10)): string {
  const urls = routes
    .map((r) => {
      const image = r.image
        ? `
    <image:image>
      <image:loc>${r.image.loc}</image:loc>
      <image:title>${escapeXml(r.image.title)}</image:title>
      <image:caption>${escapeXml(r.image.caption)}</image:caption>
    </image:image>`
        : "";
      return `  <url>
    <loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>${image}
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
