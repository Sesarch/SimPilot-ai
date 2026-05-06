import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, BookOpen, TrendingUp, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Stats = {
  totalSessions: number;
  totalMessages: number;
  totalExams: number;
  totalTopicsCompleted: number;
  recentSignups: number;
  avgExamScore: number;
};

const AdminAnalytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [sessions, messages, exams, topics] = await Promise.all([
        supabase.from("chat_sessions").select("id, created_at", { count: "exact", head: true }),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }),
        supabase.from("exam_scores").select("score, total_questions"),
        supabase.from("topic_progress").select("id", { count: "exact", head: true }).eq("completed", true),
      ]);

      // Get recent signups count from profiles created in last 7 days
      const { count: recentSignups } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo);

      const examData = exams.data || [];
      const avgScore = examData.length > 0
        ? Math.round(examData.reduce((sum, e) => sum + (e.score / e.total_questions) * 100, 0) / examData.length)
        : 0;

      setStats({
        totalSessions: sessions.count || 0,
        totalMessages: messages.count || 0,
        totalExams: examData.length,
        totalTopicsCompleted: topics.count || 0,
        recentSignups: recentSignups || 0,
        avgExamScore: avgScore,
      });
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5 animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mb-2" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "New Signups (7d)", value: stats.recentSignups, icon: TrendingUp, color: "text-green-500" },
    { label: "Chat Sessions", value: stats.totalSessions.toLocaleString(), icon: MessageSquare, color: "text-primary" },
    { label: "Messages Sent", value: stats.totalMessages.toLocaleString(), icon: Activity, color: "text-accent" },
    { label: "Exams Taken", value: stats.totalExams, icon: BookOpen, color: "text-primary" },
    { label: "Avg Exam Score", value: `${stats.avgExamScore}%`, icon: TrendingUp, color: stats.avgExamScore >= 70 ? "text-green-500" : "text-amber-500" },
    { label: "Topics Completed", value: stats.totalTopicsCompleted, icon: BookOpen, color: "text-primary" },
  ];

  return (
    <div>
      <h2 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" /> Platform Analytics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <div>
                <p className="text-2xl font-display text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnalytics;
