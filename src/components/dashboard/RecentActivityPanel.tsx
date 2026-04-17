import { useEffect, useState } from "react";
import { GraduationCap, ClipboardCheck, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LESSON_AREAS } from "@/data/groundSchoolLessons";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityItem = {
  id: string;
  kind: "exam" | "topic";
  title: string;
  subtitle: string;
  metric: string;
  metricColor: string;
  at: string; // ISO
};

const TOPIC_TITLES: Record<string, string> = Object.fromEntries(
  LESSON_AREAS.map((l) => [l.id, l.title]),
);

const formatAgo = (iso: string) => {
  const d = new Date(iso).getTime();
  const diffMs = Date.now() - d;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "JUST NOW";
  if (m < 60) return `${m}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H AGO`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}D AGO`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const RecentActivityPanel = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: exams }, { data: topics }] = await Promise.all([
        supabase
          .from("exam_scores")
          .select("id, exam_type, score, total_questions, result, created_at")
          .eq("user_id", user.id)
          .neq("result", "INCOMPLETE")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("topic_progress")
          .select("id, topic_id, completed_at")
          .eq("user_id", user.id)
          .eq("completed", true)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;

      const merged: ActivityItem[] = [];

      for (const e of exams ?? []) {
        const pct = e.total_questions ? Math.round((e.score / e.total_questions) * 100) : 0;
        const passed = (e.result || "").toUpperCase() === "PASS" || pct >= 70;
        merged.push({
          id: `exam-${e.id}`,
          kind: "exam",
          title: e.exam_type.replace(/[-_]/g, " "),
          subtitle: `Oral Exam · ${e.score}/${e.total_questions}`,
          metric: `${pct}%`,
          metricColor: passed
            ? "hsl(var(--hud-green))"
            : pct >= 50
            ? "hsl(var(--amber-instrument))"
            : "hsl(var(--destructive))",
          at: e.created_at,
        });
      }

      for (const t of topics ?? []) {
        merged.push({
          id: `topic-${t.id}`,
          kind: "topic",
          title: TOPIC_TITLES[t.topic_id] ?? t.topic_id,
          subtitle: "Ground School · Topic Complete",
          metric: "✓",
          metricColor: "hsl(var(--cyan-glow))",
          at: t.completed_at!,
        });
      }

      merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setItems(merged.slice(0, 5));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="g3000-bezel rounded-lg p-4 sm:p-5 relative overflow-hidden">
      {/* corner ticks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <h2 className="font-display text-[11px] tracking-[0.3em] uppercase text-foreground">
            Recent Activity
          </h2>
        </div>
        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
          Last 5 Events
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {items === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-1/3" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="py-6 text-center font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            No activity logged yet
          </div>
        ) : (
          items.map((it) => {
            const Icon = it.kind === "exam" ? ClipboardCheck : GraduationCap;
            const accent =
              it.kind === "exam" ? "hsl(var(--amber-instrument))" : "hsl(var(--cyan-glow))";
            return (
              <div key={it.id} className="py-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center border shrink-0"
                  style={{
                    borderColor: `${accent}55`,
                    background: `linear-gradient(135deg, ${accent}22, transparent)`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xs uppercase tracking-wider text-foreground truncate">
                    {it.title}
                  </div>
                  <div className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground truncate">
                    {it.subtitle}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className="font-display text-sm font-bold tabular-nums"
                    style={{ color: it.metricColor, textShadow: `0 0 10px ${it.metricColor}50` }}
                  >
                    {it.metric}
                  </span>
                  <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                    {formatAgo(it.at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentActivityPanel;
