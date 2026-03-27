import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Circle, TrendingUp, Award, BookOpen, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import SEOHead from "@/components/SEOHead";

const GROUND_SCHOOL_TOPICS = [
  { id: "regulations", title: "Regulations & Pilot Qualifications", acs: "PA.I.A", icon: "📋" },
  { id: "airworthiness", title: "Airworthiness Requirements", acs: "PA.I.B", icon: "🔧" },
  { id: "weather", title: "Weather Theory & Services", acs: "PA.I.C", icon: "🌦️" },
  { id: "performance", title: "Performance & Limitations", acs: "PA.I.E", icon: "📊" },
  { id: "navigation", title: "Navigation & Flight Planning", acs: "PA.I.F", icon: "🧭" },
  { id: "aerodynamics", title: "Aerodynamics & Principles of Flight", acs: "PA.I.G", icon: "✈️" },
  { id: "airport-ops", title: "Airport Operations & Airspace", acs: "PA.I.H/I", icon: "🛬" },
  { id: "adm", title: "Aeronautical Decision Making", acs: "PA.I.J", icon: "🧠" },
  { id: "emergencies", title: "Emergency Procedures", acs: "PA.IX", icon: "🚨" },
  { id: "atc-comms", title: "ATC Communications", acs: "PA.I.K", icon: "📻" },
];

const EXAM_TYPE_LABELS: Record<string, string> = {
  ppl: "Private Pilot",
  instrument: "Instrument Rating",
  commercial: "Commercial Pilot",
  cfi: "Flight Instructor",
  "quick-10": "Quick Quiz",
  "weak-areas": "Weak Area Drill",
};

type TopicProgress = { topic_id: string; completed: boolean };
type ExamScore = {
  id: string;
  exam_type: string;
  score: number;
  total_questions: number;
  result: string;
  created_at: string;
};

const ProgressPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());
  const [examScores, setExamScores] = useState<ExamScore[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("topic_progress")
      .select("topic_id, completed")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setCompletedTopics(new Set(data.filter((d: TopicProgress) => d.completed).map((d: TopicProgress) => d.topic_id)));
        }
      });

    supabase
      .from("exam_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setExamScores(data as ExamScore[]);
      });
  }, [user]);

  const toggleTopic = async (topicId: string) => {
    if (!user || toggling) return;
    setToggling(topicId);
    const isCompleted = completedTopics.has(topicId);

    const newSet = new Set(completedTopics);
    if (isCompleted) {
      newSet.delete(topicId);
    } else {
      newSet.add(topicId);
    }
    setCompletedTopics(newSet);

    const { error } = await supabase
      .from("topic_progress")
      .upsert(
        {
          user_id: user.id,
          topic_id: topicId,
          completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" }
      );

    if (error) {
      // revert
      if (isCompleted) newSet.add(topicId);
      else newSet.delete(topicId);
      setCompletedTopics(new Set(newSet));
    }
    setToggling(null);
  };

  const completionPct = Math.round((completedTopics.size / GROUND_SCHOOL_TOPICS.length) * 100);
  const avgScore = examScores.length > 0
    ? Math.round(examScores.reduce((s, e) => s + (e.score / e.total_questions) * 100, 0) / examScores.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to="/" className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
            SIM<span className="text-accent">PILOT</span>.AI
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 max-w-3xl space-y-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Training Progress</h1>
            <p className="text-sm text-muted-foreground">Track your ground school and oral exam performance</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-card rounded-xl border border-border p-4 text-center">
            <p className="text-3xl font-display font-bold text-primary">{completionPct}%</p>
            <p className="text-xs text-muted-foreground mt-1">Ground School</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border p-4 text-center">
            <p className="text-3xl font-display font-bold text-accent">{examScores.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Exams Taken</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border p-4 text-center sm:col-span-1 col-span-2">
            <p className="text-3xl font-display font-bold text-foreground">{avgScore}%</p>
            <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
          </div>
        </div>

        {/* Ground School Topics */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Ground School Topics</h2>
          </div>
          <div className="mb-3">
            <Progress value={completionPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{completedTopics.size} of {GROUND_SCHOOL_TOPICS.length} completed</p>
          </div>
          <div className="space-y-2">
            {GROUND_SCHOOL_TOPICS.map((topic) => {
              const done = completedTopics.has(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  disabled={toggling === topic.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    done
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-gradient-card hover:border-primary/20"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-lg mr-2">{topic.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? "text-primary" : "text-foreground"}`}>
                      {topic.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{topic.acs}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Score Trend Chart */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-foreground">Score Trend</h2>
          </div>
          {examScores.length < 2 ? (
            <div className="bg-gradient-card rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {examScores.length === 0 ? "Complete at least 2 exams to see your trend." : "One more exam to unlock the trend chart!"}
              </p>
            </div>
          ) : (
            <div className="bg-gradient-card rounded-xl border border-border p-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={[...examScores]
                    .reverse()
                    .map((e) => ({
                      date: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      score: Math.round((e.score / e.total_questions) * 100),
                      result: e.result,
                    }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Score"]}
                  />
                  <ReferenceLine y={70} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeOpacity={0.5} label={{ value: "Pass", position: "right", fill: "hsl(var(--primary))", fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "hsl(var(--accent))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Oral Exam Scores */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-foreground">Oral Exam History</h2>
          </div>
          {examScores.length === 0 ? (
            <div className="bg-gradient-card rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">No exam scores yet.</p>
              <Link to="/oral-exam" className="text-primary text-sm hover:underline mt-2 inline-block">
                Take your first oral exam →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {examScores.map((exam) => {
                const pct = Math.round((exam.score / exam.total_questions) * 100);
                const isPassing = exam.result === "PASS";
                return (
                  <div
                    key={exam.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border bg-gradient-card"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isPassing ? "bg-primary/20" : "bg-destructive/20"
                    }`}>
                      <span className={`text-sm font-bold ${isPassing ? "text-primary" : "text-destructive"}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {EXAM_TYPE_LABELS[exam.exam_type] || exam.exam_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exam.score}/{exam.total_questions} · {exam.result} · {new Date(exam.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
