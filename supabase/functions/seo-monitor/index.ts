// Admin-only: pulls live Google Search Console monitoring data
// (sites, sitemaps health, search analytics totals) via the Lovable
// connector gateway.
import { corsHeaders, requireAdmin } from "../_shared/audit.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console/webmasters/v3";

function gscHeaders() {
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const gsc = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovable) throw new Error("LOVABLE_API_KEY missing");
  if (!gsc) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY missing — connect Google Search Console");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": gsc,
    "Content-Type": "application/json",
  };
}

async function gscGet(path: string) {
  const res = await fetch(`${GATEWAY}${path}`, { headers: gscHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`GSC ${path} [${res.status}]: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function gscPost(path: string, body: unknown) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: gscHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GSC ${path} [${res.status}]: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(req.url);
    const requestedSite = url.searchParams.get("site") || "https://simpilot.ai/";

    // 1) Sites
    const sitesRes = await gscGet("/sites");
    const sites: Array<{ siteUrl: string; permissionLevel: string }> = sitesRes.siteEntry || [];
    const siteMatch = sites.find((s) => s.siteUrl === requestedSite) || null;

    // If the site is not in the verified set, return early with what we have.
    if (!siteMatch) {
      return new Response(
        JSON.stringify({
          site: requestedSite,
          siteVerified: false,
          sites,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const enc = encodeURIComponent(requestedSite);
    const endDate = isoDaysAgo(3); // GSC data is ~2 day delayed
    const startDate = isoDaysAgo(31);

    // 2) Sitemaps, 3) totals, 4) top pages, 5) top queries — in parallel
    const [sitemapsRes, totalsRes, topPagesRes, topQueriesRes] = await Promise.all([
      gscGet(`/sites/${enc}/sitemaps`).catch((e) => ({ error: String(e) })),
      gscPost(`/sites/${enc}/searchAnalytics/query`, {
        startDate, endDate, dimensions: [], rowLimit: 1,
      }).catch((e) => ({ error: String(e) })),
      gscPost(`/sites/${enc}/searchAnalytics/query`, {
        startDate, endDate, dimensions: ["page"], rowLimit: 10,
      }).catch((e) => ({ error: String(e) })),
      gscPost(`/sites/${enc}/searchAnalytics/query`, {
        startDate, endDate, dimensions: ["query"], rowLimit: 10,
      }).catch((e) => ({ error: String(e) })),
    ]);

    return new Response(
      JSON.stringify({
        site: requestedSite,
        siteVerified: true,
        permissionLevel: siteMatch.permissionLevel,
        sites,
        sitemaps: (sitemapsRes as { sitemap?: unknown[] }).sitemap || [],
        sitemapsError: (sitemapsRes as { error?: string }).error,
        totals: (totalsRes as { rows?: unknown[] }).rows?.[0] || null,
        totalsError: (totalsRes as { error?: string }).error,
        topPages: (topPagesRes as { rows?: unknown[] }).rows || [],
        topPagesError: (topPagesRes as { error?: string }).error,
        topQueries: (topQueriesRes as { rows?: unknown[] }).rows || [],
        topQueriesError: (topQueriesRes as { error?: string }).error,
        range: { startDate, endDate },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[seo-monitor] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
