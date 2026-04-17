import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

type MissingCode = {
  id: string;
  code: string;
  hit_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

const certColor = (code: string): { label: string; className: string } => {
  const upper = code.toUpperCase();
  if (upper.startsWith("ATP-CTP.")) return { label: "CTP", className: "bg-muted text-muted-foreground border-border" };
  const prefix = upper.split(".")[0];
  switch (prefix) {
    case "PA": return { label: "PA", className: "bg-primary/15 text-primary border-primary/30" };
    case "IR": return { label: "IR", className: "bg-accent/15 text-accent border-accent/30" };
    case "CA": return { label: "CA", className: "bg-secondary text-secondary-foreground border-border" };
    case "FI": return { label: "FI", className: "bg-destructive/15 text-destructive border-destructive/30" };
    case "ATP": return { label: "ATP", className: "bg-foreground/10 text-foreground border-foreground/20" };
    default: return { label: "?", className: "bg-muted text-muted-foreground border-border" };
  }
};

const AdminMissingAcsCodes = () => {
  const [rows, setRows] = useState<MissingCode[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from as any)("missing_acs_codes")
        .select("*")
        .order("hit_count", { ascending: false })
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      setRows((data as MissingCode[]) || []);
    } catch (err: any) {
      toast.error("Failed to load missing codes: " + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleDelete = async (id: string, code: string) => {
    try {
      const { error } = await (supabase
        .from as any)("missing_acs_codes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Cleared ${code}`);
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const headers = ["Code", "Hits", "First Seen", "Last Seen"];
    const csvRows = rows.map((r) => [
      r.code,
      String(r.hit_count),
      new Date(r.first_seen_at).toISOString(),
      new Date(r.last_seen_at).toISOString(),
    ]);
    const csv = [headers, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "missing_acs_codes.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const totalHits = rows.reduce((sum, r) => sum + r.hit_count, 0);

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            Missing ACS Codes
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Codes surfaced in the UI that aren't in the lookup. Add them to{" "}
            <code className="text-[10px] bg-muted px-1 py-0.5 rounded">src/data/acsTasks.ts</code>{" "}
            then clear the row.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length} className="text-xs h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading} className="text-xs h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-y border-border py-2">
          <span><strong className="text-foreground">{rows.length}</strong> unique codes</span>
          <span><strong className="text-foreground">{totalHits}</strong> total hits</span>
        </div>
      )}

      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">Cert</th>
              <th className="text-left p-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">Code</th>
              <th className="text-right p-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">Hits</th>
              <th className="text-left p-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:table-cell">First seen</th>
              <th className="text-left p-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">Last seen</th>
              <th className="text-right p-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cert = certColor(r.code);
              return (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="p-3">
                    <span className={`font-display font-bold text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded border ${cert.className}`}>
                      {cert.label}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-foreground">{r.code}</td>
                  <td className="p-3 text-right">
                    <Badge variant="secondary" className="text-xs">{r.hit_count}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(r.first_seen_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.last_seen_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id, r.code)}
                      title="Clear (after adding to lookup)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                  {loading ? "Loading..." : "🎉 No missing ACS codes — every code rendered so far resolves to a known task."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMissingAcsCodes;
