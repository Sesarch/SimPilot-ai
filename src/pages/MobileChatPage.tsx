import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, BookOpen, Mic, BarChart3, Clock, User, LogOut,
  MessageSquare, Home, Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TrainingChat } from "@/components/TrainingChat";
import { ChatMode } from "@/hooks/useChat";
import ThemeToggle from "@/components/ThemeToggle";
import SEOHead from "@/components/SEOHead";

type ChatTab = {
  id: string;
  label: string;
  mode: ChatMode;
  icon: React.ReactNode;
  welcome: string;
  prompt?: string;
};

const CHAT_TABS: ChatTab[] = [
  {
    id: "general",
    label: "AI Copilot",
    mode: "general",
    icon: <Shield className="w-4 h-4" />,
    welcome: "Ask me anything about aviation, flight training, regulations, or procedures.",
  },
  {
    id: "ground_school",
    label: "Ground School",
    mode: "ground_school",
    icon: <BookOpen className="w-4 h-4" />,
    welcome: "Interactive FAA ground school. Ask about any knowledge area.",
  },
  {
    id: "oral_exam",
    label: "Oral Exam",
    mode: "oral_exam",
    icon: <Mic className="w-4 h-4" />,
    welcome: "Practice your checkride oral exam with a simulated DPE.",
    prompt: "I'm preparing for my Private Pilot checkride oral exam. Act as a DPE and conduct an oral examination. Ask one question at a time. Begin now.",
  },
];

const MobileChatPage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>(CHAT_TABS[0]);
  const [chatKey, setChatKey] = useState(0);

  const switchTab = (tab: ChatTab) => {
    setActiveTab(tab);
    setChatKey((k) => k + 1);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Shield className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <SEOHead
        title="SimPilot.AI — AI Aviation Chat"
        description="Your AI aviation copilot. Chat about flying, study for exams, and prepare for your checkride."
        keywords="aviation chat, pilot training AI, checkride prep"
        canonical="/chat"
        noIndex
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-xl shrink-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-foreground hover:bg-secondary transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-display text-lg font-bold text-primary tracking-wider">
            SIM<span className="text-accent">PILOT</span>.AI
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTab.icon}
          <span className="text-xs font-display font-semibold tracking-wider uppercase text-muted-foreground">
            {activeTab.label}
          </span>
        </div>
      </header>

      {/* Slide-out menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 top-[53px]"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-[53px] left-0 bottom-0 w-72 bg-card border-r border-border z-50 flex flex-col"
            >
              {/* Chat modes */}
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-display tracking-widest uppercase text-muted-foreground mb-2">
                  Chat Modes
                </p>
                {CHAT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      activeTab.id === tab.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-border mx-4" />

              {/* Navigation */}
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-display tracking-widest uppercase text-muted-foreground mb-2">
                  Training
                </p>
                <Link
                  to="/oral-exam"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  Exam Types
                </Link>
                <Link
                  to="/ground-school"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Ground School Topics
                </Link>
                <Link
                  to="/progress"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Progress
                </Link>
                <Link
                  to="/session-history"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Session History
                </Link>
              </div>

              <div className="border-t border-border mx-4" />

              {/* Account */}
              <div className="p-4 space-y-1 mt-auto">
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Website
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full-screen chat */}
      <div className="flex-1 min-h-0">
        <TrainingChat
          key={chatKey}
          mode={activeTab.mode}
          placeholder={activeTab.mode === "oral_exam" ? "Answer the examiner..." : "Ask anything about aviation..."}
          welcomeMessage={activeTab.welcome}
          initialPrompt={activeTab.prompt}
        />
      </div>
    </div>
  );
};

export default MobileChatPage;
