import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollText, RefreshCw, Search, CalendarIcon, X, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toCSV, downloadCSV, csvDateStamp } from "@/lib/csv";

type Entry = {
  id: string;
  admin_email: string | null;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const actionColor = (a: string) => {
  if (a.includes("delete") || a.includes("ban") || a.includes("refund") || a.includes("cancel")) return "destructive";
  if (a.includes("grant") || a.includes("invite") || a.includes("unban")) return "default";
  return "secondary";
};

const ALL = "__all__";

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<string>(ALL);
  const [targetQuery, setTargetQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payments?action=audit-log&limit=500`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const j = await res.json();
      setEntries(j.entries || []);
    } catch (e: any) {
      toast.error("Load failed: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const adminOptions = useMemo(
    () => Array.from(new Set(entries.map(e => e.admin_email).filter(Boolean) as string[])).sort(),
    [entries],
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(entries.map(e => e.action))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tq = targetQuery.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom.setHours(0, 0, 0, 0)).getTime() : null;
    const toMs = dateTo ? new Date(dateTo.setHours(23, 59, 59, 999)).getTime() : null;

    return entries.filter(e => {
      if (adminFilter !== ALL && e.admin_email !== adminFilter) return false;
      if (actionFilter !== ALL && e.action !== actionFilter) return false;
      if (tq && !(e.target_id || "").toLowerCase().includes(tq)) return false;
      if (q) {
        const hay = `${e.action} ${e.admin_email || ""} ${e.target_id || ""} ${JSON.stringify(e.details || {})}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fromMs || toMs) {
        const t = new Date(e.created_at).getTime();
        if (fromMs && t < fromMs) return false;
        if (toMs && t > toMs) return false;
      }
      return true;
    });
  }, [entries, search, adminFilter, actionFilter, targetQuery, dateFrom, dateTo]);

  const hasFilters = search || adminFilter !== ALL || actionFilter !== ALL || targetQuery || dateFrom || dateTo;
  const clearFilters = () => {
    setSearch("");
    setAdminFilter(ALL);
    setActionFilter(ALL);
    setTargetQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" /> Audit Log
          <Badge variant="secondary" className="text-xs ml-2">
            {filtered.length}{filtered.length !== entries.length ? ` / ${entries.length}` : ""}
          </Badge>
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
              const rows = filtered
                .filter(e => new Date(e.created_at).getTime() >= cutoff)
                .map(e => ({
                  created_at: e.created_at,
                  admin_email: e.admin_email,
                  admin_user_id: e.admin_user_id,
                  action: e.action,
                  target_type: e.target_type,
                  target_id: e.target_id,
                  details: e.details,
                  ip_address: e.ip_address,
                }));
              if (!rows.length) { toast.info("No audit entries in the last 30 days for current filters."); return; }
              downloadCSV(
                `simpilot-audit-${csvDateStamp()}.csv`,
                toCSV(rows, ["created_at", "admin_email", "admin_user_id", "action", "target_type", "target_id", "details", "ip_address"]),
              );
            }}
            disabled={loading || !entries.length}
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={actionFilter.startsWith("ai_orchestrator") ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActionFilter(ALL);
            setSearch("ai_orchestrator");
          }}
        >
          Orchestrator access
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearch("denied")}
        >
          Denied attempts
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearch("ban")}
        >
          User bans
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearch("refund")}
        >
          Refunds
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search action, admin, target, or details…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Admin</Label>
          <Select value={adminFilter} onValueChange={setAdminFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All admins</SelectItem>
              {adminOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {actionOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Target user / ID</Label>
          <Input
            placeholder="UUID or partial"
            value={targetQuery}
            onChange={(e) => setTargetQuery(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP") : "Any"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP") : "Any"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                disabled={(d) => (dateFrom ? d < dateFrom : false)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> Clear filters
          </Button>
        </div>
      )}

      <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Admin</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Target</th>
              <th className="text-left p-3">Details</th>
              <th className="text-left p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-border/50 hover:bg-muted/10">
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-3 text-xs">{e.admin_email || "—"}</td>
                <td className="p-3">
                  <Badge variant={actionColor(e.action) as any} className="text-xs">{e.action}</Badge>
                </td>
                <td className="p-3 text-xs font-mono">
                  {e.target_type && <span className="text-muted-foreground">{e.target_type}:</span>}{" "}
                  {e.target_id ? `${e.target_id.slice(0, 16)}${e.target_id.length > 16 ? "…" : ""}` : "—"}
                </td>
                <td className="p-3 text-xs text-muted-foreground max-w-xs truncate" title={JSON.stringify(e.details)}>
                  {e.details && Object.keys(e.details).length ? JSON.stringify(e.details) : "—"}
                </td>
                <td className="p-3 text-xs font-mono text-muted-foreground">{e.ip_address || "—"}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                {loading ? "Loading…" : hasFilters ? "No matches — try clearing some filters" : "No audit entries"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLog;
