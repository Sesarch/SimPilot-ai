import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, GraduationCap, RefreshCw, Activity, Award, School, Download } from "lucide-react";
import { toast } from "sonner";
import { toCSV, downloadCSV, csvDateStamp } from "@/lib/csv";

type Report = {
  total_users: number;
  signups_last_30d: number;
  signup_trend: { date: string; signups: number }[];
  dau: number;
  wau: number;
  mau: number;
  exam_pass_rate_pct: number;
  avg_exam_score_pct: number;
  exams_taken_30d: number;
  top_schools: { name: string; seats: number; revenue_cents: number }[];
  comp_grants_active: number;
};

const fmt = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);

const exportCSV = (data: Report | null) => {
  if (!data) return;
  const summary = toCSV([{
    total_users: data.total_users,
    signups_last_30d: data.signups_last_30d,
    dau: data.dau,
    wau: data.wau,
    mau: data.mau,
    exam_pass_rate_pct: data.exam_pass_rate_pct,
    avg_exam_score_pct: data.avg_exam_score_pct,
    exams_taken_30d: data.exams_taken_30d,
    comp_grants_active: data.comp_grants_active,
  }]);
  const trend = toCSV(data.signup_trend.map(t => ({ date: t.date, signups: t.signups })));
  const schools = toCSV(data.top_schools.map(s => ({
    school: s.name, seats: s.seats, revenue_usd: ((s.revenue_cents || 0) / 100).toFixed(2),
  })));
  const csv = `# SimPilot Reports — last 30 days (exported ${new Date().toISOString()})\n\n# Summary\n${summary}\n\n# Signup trend\n${trend}\n\n# Top schools\n${schools}\n`;
  downloadCSV(`simpilot-reports-${csvDateStamp()}.csv`, csv);
};

const AdminReports = () => {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reports`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setData(await res.json());
    } catch (e: any) {
      toast.error("Load failed: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxSignups = data ? Math.max(1, ...data.signup_trend.map(t => t.signups)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Reports & Analytics
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(data)} disabled={!data}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Total users" value={data?.total_users ?? "—"} icon={<Users className="w-4 h-4" />} />
        <Card label="New (30d)" value={data?.signups_last_30d ?? "—"} icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
        <Card label="DAU / MAU" value={data ? `${data.dau} / ${data.mau}` : "—"} icon={<Activity className="w-4 h-4" />} />
        <Card label="Exam pass rate" value={data ? `${data.exam_pass_rate_pct}%` : "—"} icon={<Award className="w-4 h-4" />} />
      </div>

      {data && (
        <div className="bg-card/50 border border-border rounded-xl p-5">
          <h3 className="font-display text-sm mb-3">Signups — Last 30 Days</h3>
          <div className="flex items-end gap-[2px] h-32">
            {data.signup_trend.map((t) => (
              <div key={t.date} title={`${t.date}: ${t.signups} signups`} className="flex-1 bg-primary/70 rounded-t-sm hover:bg-primary transition-colors min-w-0"
                style={{ height: `${(t.signups / maxSignups) * 100}%`, minHeight: "2px" }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>{data.signup_trend[0]?.date}</span>
            <span>{data.signup_trend[data.signup_trend.length - 1]?.date}</span>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card/50 border border-border rounded-xl p-5">
          <h3 className="font-display text-sm mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> Exam Activity (30d)</h3>
          <Row label="Exams completed" value={data?.exams_taken_30d ?? "—"} />
          <Row label="Avg score" value={data ? `${data.avg_exam_score_pct}%` : "—"} />
          <Row label="Pass rate (≥70%)" value={data ? `${data.exam_pass_rate_pct}%` : "—"} />
          <Row label="WAU" value={data?.wau ?? "—"} />
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-5">
          <h3 className="font-display text-sm mb-3 flex items-center gap-2"><School className="w-4 h-4 text-primary" /> Top Schools</h3>
          {data?.top_schools.length ? (
            <ul className="space-y-2 text-sm">
              {data.top_schools.map((s) => (
                <li key={s.name} className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0">
                  <span className="truncate pr-3">{s.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{s.seats} seats · {fmt(s.revenue_cents)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No paid school purchases yet.</p>}
        </div>
      </div>
    </div>
  );
};

const Card = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="bg-card/50 border border-border rounded-xl p-5">
    <div className="flex items-center justify-between mb-1 text-muted-foreground">
      <span className="text-xs uppercase tracking-wider">{label}</span>{icon}
    </div>
    <p className="text-2xl font-display text-foreground">{value}</p>
  </div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1.5 border-b border-border/40 last:border-0 text-sm">
    <span className="text-muted-foreground">{label}</span><span className="">{value}</span>
  </div>
);

export default AdminReports;
