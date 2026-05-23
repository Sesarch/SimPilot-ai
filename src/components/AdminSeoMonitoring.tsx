import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Globe, AlertTriangle, CheckCircle2, FileSearch, TrendingUp } from "lucide-react";
import { toast } from "sonner";

/**
 * Live Google Search Console monitoring panel. Reads from the
 * `seo-monitor` edge function which proxies the GSC connector gateway.
 */

type Sitemap = {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  warnings?: string;
  errors?: string;
  contents?: Array<{ type: string; submitted?: string; indexed?: string }>;
};

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

type MonitorData = {
  site: string;
  siteVerified: boolean;
  permissionLevel?: string;
  sites?: Array<{ siteUrl: string; permissionLevel: string }>;
  sitemaps?: Sitemap[];
  sitemapsError?: string;
  totals?: Row | null;
  totalsError?: string;
  topPages?: Row[];
  topPagesError?: string;
  topQueries?: Row[];
  topQueriesError?: string;
  range?: { startDate: string; endDate: string };
};

const SITE = "https://simpilot.ai/";

const num = (s?: string | number) => {
  const n = typeof s === "string" ? parseInt(s, 10) : s ?? 0;
  return Number.isFinite(n) ? n : 0;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const AdminSeoMonitoring = () => {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("seo-monitor", {
        body: {},
      });
      if (err) throw err;
      if (res?.error) throw new Error(res.error);
      setData(res as MonitorData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`SEO monitor: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" /> Search Console monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" /> Search Console monitoring
            </CardTitle>
            <CardDescription className="text-destructive mt-1">{error}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  if (!data) return null;

  const sitemaps = data.sitemaps || [];
  const totalErrors = sitemaps.reduce((s, sm) => s + num(sm.errors), 0);
  const totalWarnings = sitemaps.reduce((s, sm) => s + num(sm.warnings), 0);
  const totalSubmitted = sitemaps.flatMap((s) => s.contents || []).reduce((s, c) => s + num(c.submitted), 0);
  const totalIndexed = sitemaps.flatMap((s) => s.contents || []).reduce((s, c) => s + num(c.indexed), 0);
  const indexCoverage = totalSubmitted > 0 ? totalIndexed / totalSubmitted : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" /> Search Console monitoring
            </CardTitle>
            <CardDescription>
              Live Google Search Console data for <code>{data.site}</code>
              {data.range && (
                <> · last 28d ({data.range.startDate} → {data.range.endDate})</>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data.siteVerified ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="w-4 h-4" /> {SITE} is not verified in this Search Console account
              </div>
              <p className="text-xs text-muted-foreground">
                Verified properties on this connection:
              </p>
              <ul className="text-xs space-y-1">
                {(data.sites || []).map((s) => (
                  <li key={s.siteUrl} className="font-mono">
                    {s.siteUrl} <span className="text-muted-foreground">({s.permissionLevel})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Clicks (28d)"
                value={data.totals?.clicks ?? 0}
                Icon={TrendingUp}
              />
              <StatCard
                label="Impressions (28d)"
                value={data.totals?.impressions ?? 0}
                Icon={TrendingUp}
              />
              <StatCard
                label="Avg CTR"
                value={fmtPct(data.totals?.ctr ?? 0)}
                Icon={TrendingUp}
              />
              <StatCard
                label="Avg position"
                value={(data.totals?.position ?? 0).toFixed(1)}
                Icon={TrendingUp}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {data.siteVerified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5" /> Sitemap & indexing health
            </CardTitle>
            <CardDescription>
              Indexed {totalIndexed} / {totalSubmitted} submitted URLs ({fmtPct(indexCoverage)})
              {" · "}
              {totalErrors > 0 ? (
                <span className="text-destructive">{totalErrors} errors</span>
              ) : (
                <span className="text-emerald-500">0 errors</span>
              )}
              {totalWarnings > 0 && <span className="text-amber-500"> · {totalWarnings} warnings</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sitemapsError && (
              <div className="text-xs text-destructive">{data.sitemapsError}</div>
            )}
            {sitemaps.length === 0 && !data.sitemapsError && (
              <div className="text-sm text-muted-foreground">
                No sitemaps submitted to Search Console yet.
              </div>
            )}
            {sitemaps.map((sm) => {
              const errs = num(sm.errors);
              const warns = num(sm.warnings);
              return (
                <div key={sm.path} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs truncate">{sm.path}</div>
                    <div className="flex gap-2">
                      {errs > 0 ? (
                        <Badge variant="destructive">{errs} errors</Badge>
                      ) : (
                        <Badge className="bg-emerald-600/15 text-emerald-500 border-emerald-600/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> No errors
                        </Badge>
                      )}
                      {warns > 0 && (
                        <Badge className="bg-amber-600/15 text-amber-500 border-amber-600/30">
                          {warns} warnings
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>Submitted: {sm.lastSubmitted ? new Date(sm.lastSubmitted).toLocaleDateString() : "—"}</div>
                    <div>Downloaded: {sm.lastDownloaded ? new Date(sm.lastDownloaded).toLocaleDateString() : "—"}</div>
                    <div>Pending: {sm.isPending ? "yes" : "no"}</div>
                    <div>
                      {sm.contents?.map((c) => `${c.type}: ${num(c.indexed)}/${num(c.submitted)}`).join(" · ") || "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {data.siteVerified && (data.topPages?.length || data.topQueries?.length) ? (
        <div className="grid md:grid-cols-2 gap-4">
          <RowsTable
            title="Top pages"
            rows={data.topPages || []}
            err={data.topPagesError}
            keyLabel="Page"
          />
          <RowsTable
            title="Top queries"
            rows={data.topQueries || []}
            err={data.topQueriesError}
            keyLabel="Query"
          />
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({
  label, value, Icon,
}: { label: string; value: string | number; Icon: typeof TrendingUp }) => (
  <div className="rounded-lg border p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="text-2xl font-display tracking-wider mt-1">{value}</div>
  </div>
);

const RowsTable = ({
  title, rows, err, keyLabel,
}: { title: string; rows: Row[]; err?: string; keyLabel: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-sm">
      {err && <div className="text-xs text-destructive mb-2">{err}</div>}
      {rows.length === 0 && !err && <div className="text-muted-foreground text-xs">No data yet.</div>}
      {rows.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left font-normal pb-1">{keyLabel}</th>
              <th className="text-right font-normal pb-1">Clicks</th>
              <th className="text-right font-normal pb-1">Impr.</th>
              <th className="text-right font-normal pb-1">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="py-1 truncate max-w-[200px]">{r.keys?.[0] ?? "—"}</td>
                <td className="py-1 text-right">{r.clicks}</td>
                <td className="py-1 text-right">{r.impressions}</td>
                <td className="py-1 text-right">{r.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardContent>
  </Card>
);

export default AdminSeoMonitoring;
