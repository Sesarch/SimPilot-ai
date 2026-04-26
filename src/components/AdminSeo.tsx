import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Save, Search, FileCode, Bot } from "lucide-react";
import { z } from "zod";

/**
 * SEO admin tab — one-click view of robots.txt / sitemap.xml health on the
 * live origin plus a place to paste Google Search Console & Bing verification
 * tokens. Tokens persist in `site_settings` and are injected sitewide via
 * <SiteVerificationTags />.
 */

const SITE_ORIGIN = "https://simpilot.ai";

const tokenSchema = z
  .string()
  .trim()
  .max(200, "Token must be under 200 characters")
  .regex(/^[A-Za-z0-9_\-]*$/, "Only letters, digits, '-' and '_' are allowed");

const propertyUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\//i.test(v),
    "Must be a full https:// URL or empty",
  );

type AssetStatus = {
  url: string;
  ok: boolean | null;
  status?: number;
  contentType?: string;
  bytes?: number;
  itemCount?: number;
  lastModified?: string;
  error?: string;
};

const fetchAssetStatus = async (path: string, kind: "robots" | "sitemap"): Promise<AssetStatus> => {
  const url = `${SITE_ORIGIN}${path}`;
  try {
    const res = await fetch(`${url}?_=${Date.now()}`, { cache: "no-store" });
    const text = await res.text();
    const status: AssetStatus = {
      url,
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type") ?? undefined,
      bytes: text.length,
      lastModified: res.headers.get("last-modified") ?? undefined,
    };
    if (kind === "sitemap") {
      status.itemCount = (text.match(/<loc>/g) || []).length;
    } else {
      status.itemCount = text.split("\n").filter((l) => l.trim() && !l.startsWith("#")).length;
    }
    return status;
  } catch (err) {
    return { url, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

const StatusBadge = ({ status }: { status: AssetStatus }) => {
  if (status.ok === null) return <Badge variant="outline">Checking…</Badge>;
  if (status.ok) {
    return (
      <Badge className="bg-emerald-600/15 text-emerald-500 border-emerald-600/30">
        <CheckCircle2 className="w-3 h-3 mr-1" /> {status.status} OK
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <XCircle className="w-3 h-3 mr-1" /> {status.status ?? "ERR"}
    </Badge>
  );
};

const AdminSeo = () => {
  const [robots, setRobots] = useState<AssetStatus>({ url: `${SITE_ORIGIN}/robots.txt`, ok: null });
  const [sitemap, setSitemap] = useState<AssetStatus>({ url: `${SITE_ORIGIN}/sitemap.xml`, ok: null });
  const [refreshing, setRefreshing] = useState(false);

  const [google, setGoogle] = useState("");
  const [bing, setBing] = useState("");
  const [propertyUrl, setPropertyUrl] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    const [r, s] = await Promise.all([
      fetchAssetStatus("/robots.txt", "robots"),
      fetchAssetStatus("/sitemap.xml", "sitemap"),
    ]);
    setRobots(r);
    setSitemap(s);
    setRefreshing(false);
  };

  useEffect(() => {
    refresh();
    (async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("google_site_verification, bing_site_verification, google_search_console_property_url")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data) {
        setGoogle(data.google_site_verification ?? "");
        setBing(data.bing_site_verification ?? "");
        setPropertyUrl(data.google_search_console_property_url ?? "");
      }
      setInitialLoad(false);
    })();
  }, []);

  const gscSubmitUrl = useMemo(() => {
    const property = propertyUrl.trim() || SITE_ORIGIN;
    const enc = encodeURIComponent(property);
    return `https://search.google.com/search-console/sitemaps?resource_id=${enc}`;
  }, [propertyUrl]);

  const bingSubmitUrl = "https://www.bing.com/webmasters/sitemaps";

  const save = async () => {
    const g = tokenSchema.safeParse(google);
    const b = tokenSchema.safeParse(bing);
    const p = propertyUrlSchema.safeParse(propertyUrl);
    if (!g.success) return toast.error(`Google token: ${g.error.issues[0].message}`);
    if (!b.success) return toast.error(`Bing token: ${b.error.issues[0].message}`);
    if (!p.success) return toast.error(`Property URL: ${p.error.issues[0].message}`);

    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        google_site_verification: g.data,
        bing_site_verification: b.data,
        google_search_console_property_url: p.data,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success("SEO settings saved. Verification tags will appear on the next page load.");
    window.dispatchEvent(
      new CustomEvent("simpilot:site-settings-updated", {
        detail: {
          google_site_verification: g.data,
          bing_site_verification: b.data,
          google_search_console_property_url: p.data,
        },
      }),
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" /> Search engine assets
            </CardTitle>
            <CardDescription>
              Live status of robots.txt and sitemap.xml on {SITE_ORIGIN}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "robots.txt", state: robots, countLabel: "rules" },
            { label: "sitemap.xml", state: sitemap, countLabel: "URLs" },
          ].map(({ label, state, countLabel }) => (
            <div key={label} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display tracking-wider">
                  <FileCode className="w-4 h-4" /> {label}
                </div>
                <StatusBadge status={state} />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="truncate">{state.url}</div>
                {state.ok && (
                  <>
                    <div>{state.itemCount ?? 0} {countLabel} · {state.bytes ?? 0} bytes</div>
                    {state.lastModified && <div>Last modified: {state.lastModified}</div>}
                  </>
                )}
                {state.error && <div className="text-destructive">{state.error}</div>}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="ghost">
                  <a href={state.url} target="_blank" rel="noreferrer">
                    Open <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" /> Verification tokens
          </CardTitle>
          <CardDescription>
            Paste the meta-tag <code>content</code> value from each search console.
            Tokens are injected sitewide on the next page load.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="gsc-property">Google Search Console property URL (optional)</Label>
            <Input
              id="gsc-property"
              placeholder="https://simpilot.ai/"
              value={propertyUrl}
              onChange={(e) => setPropertyUrl(e.target.value)}
              disabled={initialLoad}
            />
            <p className="text-xs text-muted-foreground">
              Used to build the one-click "Submit sitemap" link. Defaults to {SITE_ORIGIN}.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="google-token">
                Google: <code className="text-xs">google-site-verification</code>
              </Label>
              <Input
                id="google-token"
                placeholder="abc123…"
                value={google}
                onChange={(e) => setGoogle(e.target.value)}
                disabled={initialLoad}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bing-token">
                Bing: <code className="text-xs">msvalidate.01</code>
              </Label>
              <Input
                id="bing-token"
                placeholder="ABCDEF1234…"
                value={bing}
                onChange={(e) => setBing(e.target.value)}
                disabled={initialLoad}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving || initialLoad}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save tokens"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-display tracking-wider">One-click actions</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href={gscSubmitUrl} target="_blank" rel="noreferrer">
                  Submit sitemap to Google <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href={bingSubmitUrl} target="_blank" rel="noreferrer">
                  Submit sitemap to Bing <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(SITE_ORIGIN)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Rich Results test <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`https://pagespeed.web.dev/report?url=${encodeURIComponent(SITE_ORIGIN)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  PageSpeed Insights <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSeo;
