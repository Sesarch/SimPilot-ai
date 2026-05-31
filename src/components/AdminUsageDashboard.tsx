import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type UsageRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  total_messages: number;
  today_messages: number;
  last_7d_messages: number;
  last_30d_messages: number;
  sessions: number;
  last_active: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const AdminUsageDashboard = () => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"total" | "30d" | "7d" | "today">("total");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const since7 = new Date(Date.now() - 7 * 86400000);
      const since30 = new Date(Date.now() - 30 * 86400000);

      // Pull authoritative counts directly from the database. We aggregate
      // chat_messages joined to chat_sessions so the count matches what users
      // actually sent (single source of truth, no retyping).
      const [profilesRes, sessionsRes, messagesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, subscription_tier, subscription_status, trial_ends_at"),
        supabase
          .from("chat_sessions")
          .select("id, user_id, updated_at"),
        supabase
          .from("chat_messages")
          .select("session_id, role, created_at"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (messagesRes.error) throw messagesRes.error;

      // Map session -> user
      const sessionUser = new Map<string, string>();
      const sessionsByUser = new Map<string, number>();
      const lastActive = new Map<string, string>();
      (sessionsRes.data || []).forEach((s: any) => {
        sessionUser.set(s.id, s.user_id);
        sessionsByUser.set(s.user_id, (sessionsByUser.get(s.user_id) || 0) + 1);
        const prev = lastActive.get(s.user_id);
        if (!prev || new Date(s.updated_at) > new Date(prev)) {
          lastActive.set(s.user_id, s.updated_at);
        }
      });

      // Count user messages only (role = "user") so we measure prompts sent.
      const total = new Map<string, number>();
      const todayC = new Map<string, number>();
      const c7 = new Map<string, number>();
      const c30 = new Map<string, number>();
      (messagesRes.data || []).forEach((m: any) => {
        if (m.role !== "user") return;
        const uid = sessionUser.get(m.session_id);
        if (!uid) return;
        const created = new Date(m.created_at);
        total.set(uid, (total.get(uid) || 0) + 1);
        if (created >= today) todayC.set(uid, (todayC.get(uid) || 0) + 1);
        if (created >= since7) c7.set(uid, (c7.get(uid) || 0) + 1);
        if (created >= since30) c30.set(uid, (c30.get(uid) || 0) + 1);
      });

      // Fetch emails via admin-users edge function (we already use this elsewhere)
      const session = (await supabase.auth.getSession()).data.session;
      const usersRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      const usersJson = usersRes.ok ? await usersRes.json() : { users: [] };
      const emailByUid = new Map<string, string>();
      (usersJson.users || []).forEach((u: any) => emailByUid.set(u.id, u.email));

      const compiled: UsageRow[] = (profilesRes.data || []).map((p: any) => ({
        user_id: p.user_id,
        email: emailByUid.get(p.user_id) || "(unknown)",
        display_name: p.display_name,
        total_messages: total.get(p.user_id) || 0,
        today_messages: todayC.get(p.user_id) || 0,
        last_7d_messages: c7.get(p.user_id) || 0,
        last_30d_messages: c30.get(p.user_id) || 0,
        sessions: sessionsByUser.get(p.user_id) || 0,
        last_active: lastActive.get(p.user_id) || null,
        subscription_tier: p.subscription_tier,
        subscription_status: p.subscription_status,
        trial_ends_at: p.trial_ends_at,
      }));

      setRows(compiled);
    } catch (err) {
      console.error("[AdminUsageDashboard] failed:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSorted = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = rows.filter((r) =>
      !q || r.email.toLowerCase().includes(q) || (r.display_name || "").toLowerCase().includes(q),
    );
    const key: Record<typeof sort, keyof UsageRow> = {
      total: "total_messages",
      "30d": "last_30d_messages",
      "7d": "last_7d_messages",
      today: "today_messages",
    };
    return [...filtered].sort((a, b) => (b[key[sort]] as number) - (a[key[sort]] as number));
  }, [rows, search, sort]);

  const totals = useMemo(() => ({
    users: rows.length,
    total: rows.reduce((s, r) => s + r.total_messages, 0),
    d30: rows.reduce((s, r) => s + r.last_30d_messages, 0),
    d7: rows.reduce((s, r) => s + r.last_7d_messages, 0),
    today: rows.reduce((s, r) => s + r.today_messages, 0),
  }), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-lg text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Live Usage (Source of Truth)
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Users", value: totals.users },
          { label: "Total Msgs", value: totals.total },
          { label: "Last 30d", value: totals.d30 },
          { label: "Last 7d", value: totals.d7 },
          { label: "Today", value: totals.today },
        ].map((c) => (
          <div key={c.label} className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-4">
            <p className="text-2xl font-display text-foreground">{c.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or name..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["total", "30d", "7d", "today"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={sort === k ? "default" : "outline"}
              onClick={() => setSort(k)}
            >
              Sort: {k}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">30d</TableHead>
              <TableHead className="text-right">7d</TableHead>
              <TableHead className="text-right">Today</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!loading && filteredSorted.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users.</TableCell></TableRow>
            )}
            {!loading && filteredSorted.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell>
                  <div className="font-medium text-foreground">{r.display_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell className="text-right font-mono">{r.total_messages}</TableCell>
                <TableCell className="text-right font-mono">{r.last_30d_messages}</TableCell>
                <TableCell className="text-right font-mono">{r.last_7d_messages}</TableCell>
                <TableCell className="text-right font-mono">{r.today_messages}</TableCell>
                <TableCell className="text-right font-mono">{r.sessions}</TableCell>
                <TableCell>
                  {r.subscription_status === "active" ? (
                    <Badge variant="default">{r.subscription_tier || "active"}</Badge>
                  ) : r.trial_ends_at && new Date(r.trial_ends_at) > new Date() ? (
                    <Badge variant="secondary">trial</Badge>
                  ) : (
                    <Badge variant="outline">free</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(r.last_active)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsageDashboard;
