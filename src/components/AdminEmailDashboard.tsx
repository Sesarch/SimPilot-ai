import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, RefreshCw, Send, AlertTriangle, Clock, Filter, XCircle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type EmailLog = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

type EmailStats = {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  suppressed: number;
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  dlq: "bg-red-500/20 text-red-400 border-red-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  suppressed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  bounced: "bg-red-500/20 text-red-400 border-red-500/30",
  complained: "bg-red-500/20 text-red-400 border-red-500/30",
};

const TIME_RANGES = [
  { label: "Last 24h", value: "24h", hours: 24 },
  { label: "Last 7 days", value: "7d", hours: 168 },
  { label: "Last 30 days", value: "30d", hours: 720 },
  { label: "All time", value: "all", hours: 0 },
];

const AdminEmailDashboard = () => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, pending: 0, suppressed: 0 });
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-emails?action=stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTemplates(data.templates || []);

      // Apply client-side filters
      let filtered: EmailLog[] = data.emails || [];

      // Time range filter
      const range = TIME_RANGES.find((r) => r.value === timeRange);
      if (range && range.hours > 0) {
        const cutoff = new Date(Date.now() - range.hours * 60 * 60 * 1000);
        filtered = filtered.filter((e) => new Date(e.created_at) >= cutoff);
      }

      // Template filter
      if (templateFilter !== "all") {
        filtered = filtered.filter((e) => e.template_name === templateFilter);
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "failed") {
          filtered = filtered.filter((e) => e.status === "dlq" || e.status === "failed");
        } else {
          filtered = filtered.filter((e) => e.status === statusFilter);
        }
      }

      // Compute stats from filtered
      setStats({
        total: filtered.length,
        sent: filtered.filter((e) => e.status === "sent").length,
        failed: filtered.filter((e) => e.status === "dlq" || e.status === "failed").length,
        pending: filtered.filter((e) => e.status === "pending").length,
        suppressed: filtered.filter((e) => e.status === "suppressed").length,
      });

      setEmails(filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err: any) {
      toast.error("Failed to load email data: " + err.message);
    }
    setLoading(false);
  }, [timeRange, templateFilter, statusFilter]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Email Dashboard
        </h2>
        <Button variant="outline" size="sm" onClick={fetchEmails} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">{stats.sent}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sent</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">{stats.failed}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Email Log Table */}
      <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Template</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Recipient</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="text-left p-3 font-display text-xs uppercase tracking-wider text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="p-3">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {email.template_name}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-foreground">{email.recipient_email}</td>
                  <td className="p-3">
                    <Badge className={`text-[10px] ${STATUS_COLORS[email.status] || "bg-muted text-muted-foreground"}`}>
                      {email.status === "dlq" ? "failed" : email.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(email.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-xs text-destructive max-w-[200px] truncate" title={email.error_message || ""}>
                    {email.error_message ? (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 flex-shrink-0" />
                        {email.error_message}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {emails.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {loading ? "Loading emails..." : "No emails found for this filter"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminEmailDashboard;
