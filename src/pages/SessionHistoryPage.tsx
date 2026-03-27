import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plane, ArrowLeft, BookOpen, Mic, MessageSquare, Trash2, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import SEOHead from "@/components/SEOHead";

type Session = {
  id: string;
  mode: string;
  title: string;
  created_at: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

const modeLabels: Record<string, { label: string; icon: typeof BookOpen }> = {
  ground_school: { label: "Ground School", icon: BookOpen },
  oral_exam: { label: "Oral Exam", icon: Mic },
  general: { label: "General", icon: MessageSquare },
};

const SessionHistoryPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingSessions(true);
    supabase
      .from("chat_sessions")
      .select("id, mode, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSessions(data || []);
        setLoadingSessions(false);
      });
  }, [user]);

  const openSession = async (session: Session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMessages(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chat_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (selectedSession?.id === id) {
      setSelectedSession(null);
      setMessages([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Plane className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Session History — SimPilot.AI"
        description="Review your past AI training sessions on SimPilot.AI. Access ground school and oral exam chat transcripts to revisit key concepts."
        keywords="training session history, pilot chat logs, ground school review, oral exam transcripts, AI training records"
        canonical="/session-history"
        noIndex
      />
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
              SIM<span className="text-accent">PILOT</span>.AI
            </span>
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Session History</h1>
            <p className="text-sm text-muted-foreground">Review your past training conversations</p>
          </div>
        </div>

        {selectedSession ? (
          <div>
            <button
              onClick={() => { setSelectedSession(null); setMessages([]); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sessions
            </button>

            <div className="bg-gradient-card rounded-xl border border-border p-4 mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">{selectedSession.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">
                  {modeLabels[selectedSession.mode]?.label || selectedSession.mode}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedSession.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {loadingMessages ? (
              <div className="flex justify-center py-12">
                <Plane className="w-6 h-6 text-primary animate-pulse" />
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary/20 text-foreground border border-primary/30"
                          : "bg-secondary text-foreground border border-border"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&_strong]:text-primary [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_li]:text-foreground [&_p]:text-foreground">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {loadingSessions ? (
              <div className="flex justify-center py-12">
                <Plane className="w-6 h-6 text-primary animate-pulse" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No training sessions yet.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Start a{" "}
                  <Link to="/ground-school" className="text-primary hover:underline">Ground School</Link>{" "}
                  or{" "}
                  <Link to="/oral-exam" className="text-primary hover:underline">Oral Exam</Link>{" "}
                  session to begin.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const meta = modeLabels[session.mode] || modeLabels.general;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={session.id}
                      onClick={() => openSession(session)}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-card rounded-xl border border-border hover:border-primary/40 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{meta.label}</span>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString(undefined, {
                              month: "short", day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="p-2 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SessionHistoryPage;
