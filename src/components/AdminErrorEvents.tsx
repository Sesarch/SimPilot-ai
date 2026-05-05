import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Search, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type ErrorEvent = {
  id: string;
  created_at: string;
  user_id: string | null;
  session_id: string | null;
  release: string | null;
  environment: string;
  source: string;
  level: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
  url: string | null;
  route: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  status_code: number | null;
  endpoint: string | null;
  fingerprint: string | null;
  metadata: Record<string, unknown> | null;
};

const levelColor: Record<string, string> = {
  fatal: "bg-red-500/20 text-red-300 border-red-500/40",
  error: "bg-red-500/15 text-red-300 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export default function AdminErrorEvents() {
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ErrorEvent | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("error_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Failed to load error events");
    } else {
      setEvents((data || []) as ErrorEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
      if (levelFilter !== "all" && e.level !== levelFilter) return false;
      if (!q) return true;
      return (
        e.message.toLowerCase().includes(q) ||
        (e.route || "").toLowerCase().includes(q) ||
        (e.endpoint || "").toLowerCase().includes(q) ||
        (e.browser || "").toLowerCase().includes(q) ||
        (e.user_id || "").toLowerCase().includes(q) ||
        (e.fingerprint || "").toLowerCase().includes(q)
      );
    });
  }, [events, search, sourceFilter, levelFilter]);

  // Group by fingerprint for the summary
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; last: ErrorEvent }>();
    for (const e of filtered) {
      const key = e.fingerprint || e.message;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { count: 1, last: e });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
    );
  }, [filtered]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("error_events").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event deleted");
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Delete all ${filtered.length} filtered error events? This cannot be undone.`)) return;
    const ids = filtered.map((e) => e.id);
    const { error } = await supabase.from("error_events").delete().in("id", ids);
    if (error) toast.error("Bulk delete failed");
    else {
      setEvents((prev) => prev.filter((e) => !ids.includes(e.id)));
      toast.success(`Deleted ${ids.length} events`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search message, route, endpoint, user, browser…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="window">Window (JS)</SelectItem>
            <SelectItem value="promise">Promise rejection</SelectItem>
            <SelectItem value="react">React render</SelectItem>
            <SelectItem value="edge_function">Edge function</SelectItem>
            <SelectItem value="network">Network/API</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="fatal">Fatal</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {filtered.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear filtered
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total events" value={events.length} />
        <StatCard label="Filtered" value={filtered.length} />
        <StatCard label="Unique issues" value={grouped.length} />
        <StatCard
          label="Last 1h"
          value={events.filter((e) => Date.now() - new Date(e.created_at).getTime() < 3600_000).length}
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-2 font-display text-xs tracking-wider">When</th>
              <th className="p-2 font-display text-xs tracking-wider">Level</th>
              <th className="p-2 font-display text-xs tracking-wider">Source</th>
              <th className="p-2 font-display text-xs tracking-wider">Message</th>
              <th className="p-2 font-display text-xs tracking-wider">Route</th>
              <th className="p-2 font-display text-xs tracking-wider">Count</th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No errors recorded. The flight deck is clean.
              </td></tr>
            )}
            {grouped.map(({ count, last }) => (
              <tr
                key={last.id}
                className="border-t border-border hover:bg-muted/20 cursor-pointer"
                onClick={() => setSelected(last)}
              >
                <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(last.created_at), { addSuffix: true })}
                </td>
                <td className="p-2">
                  <Badge variant="outline" className={levelColor[last.level] || ""}>{last.level}</Badge>
                </td>
                <td className="p-2 text-xs">{last.source}</td>
                <td className="p-2 max-w-[420px] truncate">{last.message}</td>
                <td className="p-2 text-xs text-muted-foreground">{last.route || "—"}</td>
                <td className="p-2"><Badge variant="secondary">{count}</Badge></td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(last.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Error detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Field label="Message" value={selected.message} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source" value={selected.source} />
                <Field label="Level" value={selected.level} />
                <Field label="Route" value={selected.route || "—"} />
                <Field label="Status" value={selected.status_code?.toString() || "—"} />
                <Field label="Endpoint" value={selected.endpoint || "—"} />
                <Field label="Release" value={selected.release || "—"} />
                <Field label="Browser" value={`${selected.browser || "?"} / ${selected.os || "?"}`} />
                <Field label="User" value={selected.user_id || "anonymous"} />
              </div>
              <Field label="URL" value={selected.url || "—"} />
              <Field label="User agent" value={selected.user_agent || "—"} mono />
              {selected.stack && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Stack trace</div>
                  <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {selected.stack}
                  </pre>
                </div>
              )}
              {selected.component_stack && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Component stack</div>
                  <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {selected.component_stack}
                  </pre>
                </div>
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Metadata</div>
                  <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card/50">
      <div className="text-xs text-muted-foreground font-display tracking-wider">{label}</div>
      <div className="text-2xl font-display text-primary">{value}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs break-all" : "text-sm break-words"}>{value}</div>
    </div>
  );
}
