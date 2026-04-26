import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollText, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

type Entry = {
  id: string;
  admin_email: string | null;
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

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payments?action=audit-log&limit=200`, {
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

  const filtered = entries.filter(e => {
    const q = filter.toLowerCase();
    return !q || e.action.toLowerCase().includes(q) || (e.admin_email || "").toLowerCase().includes(q) || (e.target_id || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" /> Audit Log
          <Badge variant="secondary" className="text-xs ml-2">{entries.length}</Badge>
        </h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Filter by action, admin email, or target..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
      </div>

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
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? "Loading…" : "No audit entries"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLog;
