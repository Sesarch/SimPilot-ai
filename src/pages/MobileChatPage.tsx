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
import { useSiteSettings } from "@/hooks/useSiteSettings";
import FeatureDisabledPage from "@/components/FeatureDisabledPage";
import Logo from "@/components/Logo";

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
    label: "Ground One-on-One",
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
  const { settings } = useSiteSettings();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>(CHAT_TABS[0]);
  const [chatKey, setChatKey] = useState(0);

  if (!settings.chat_enabled) return <FeatureDisabledPage feature="AI Chat" />;

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
        title="AI Aviation Chat — SimPilot.AI Mobile CFI"
        description="Chat with your SimPilot.AI CFI on mobile. Ask aviation questions, study for the FAA written exam, drill oral exam topics, and prep for your checkride anywhere."
        keywords="aviation chat, mobile pilot training, AI CFI chat, ground school chat, oral exam practice, checkride prep mobile, FAA written exam help"
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
          <Logo height={24} />
        </div>
        <div className="flex items-center gap-1.5">
          {activeTab.icon}
          <span className="text-xs font-display tracking-wider uppercase text-muted-foreground">
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
                        ? "bg-primary/10 text-primary "
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
                  Ground One-on-One Topics
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

      {/* Bottom tab navigation */}
      <nav className="shrink-0 border-t border-border bg-background/95 backdrop-blur-xl flex items-stretch z-40">
        {CHAT_TABS.map((tab) => {
          const isActive = activeTab.id === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={isActive ? "text-primary" : ""}>{tab.icon}</span>
              <span className="text-[10px] font-display tracking-wider uppercase">
                {tab.id === "general" ? "Chat" : tab.id === "ground_school" ? "School" : "Exam"}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
        <Link
          to="/dashboard"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-display tracking-wider uppercase">
            Profile
          </span>
        </Link>
      </nav>
    </div>
  );
};

export default MobileChatPage;
