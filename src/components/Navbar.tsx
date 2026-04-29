import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePilotContext } from "@/hooks/usePilotContext";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

const navItems = [
  { label: "Why SimPilot.AI", href: "/competitors#comparison-matrix" },
  { label: "Ground One-on-One", href: "/ground-school" },
  { label: "Oral Exam", href: "/oral-exam" },
  { label: "Live Sky", href: "/live-tools", live: true },
  { label: "Get Started", href: "/intake" },
  { label: "Pricing", href: "/#pricing" },
];

/** Map any profile certificate_type string to a short Study Track label. */
function toTrackLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("atp") || v.includes("airline transport")) return "ATP";
  if (v.includes("instrument") || v === "ir") return "IR";
  if (v.includes("commercial") || v === "cpl") return "CPL";
  if (v.includes("private") || v === "ppl" || v.includes("student") || v.includes("sport") || v.includes("recreational")) return "PPL";
  return null;
}

const StudyTrackBadge = ({ track, onClick }: { track: string; onClick?: () => void }) => (
  <Link
    to="/ground-school"
    onClick={onClick}
    title={`Active Study Track: ${track} — your CFI-AI is using ${track} ACS depth. Click to change.`}
    aria-label={`Active Study Track: ${track}. Click to change.`}
    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--cyan-glow)/0.3)] transition-all"
  >
    <GraduationCap size={12} />
    <span className="font-display text-[10px] font-bold tracking-widest uppercase">{track}</span>
  </Link>
);


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { context: pilotCtx } = usePilotContext();
  const studyTrack = toTrackLabel(pilotCtx.certificate_type);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone) { setIsInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      window.open(window.location.origin, "_blank");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center" title="SimPilot.AI — AI-Powered Pilot Training Home" aria-label="Go to SimPilot.AI homepage">
          <Logo height={32} />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                title={`SimPilot.AI ${item.label} — AI pilot training module`}
                className="relative flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300 tracking-wide uppercase"
              >
                {item.live && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400/40 animate-pulse" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_6px_1.5px_rgba(34,197,94,0.5)]" />
                  </span>
                )}
                {item.label}
              </Link>
          ))}
          {!isInstalled && (
            <button
              onClick={handleInstall}
              title="Install SimPilot.AI app"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300 tracking-wide uppercase"
            >
              <Download size={14} />
              Install App
            </button>
          )}
          <ThemeToggle />
          {studyTrack && <StudyTrackBadge track={studyTrack} />}
          {user ? (
            <Link
              to="/dashboard"
              title="Access your SimPilot.AI pilot training dashboard"
              className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded border border-primary/50 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              title="Sign in to SimPilot.AI — start your AI pilot training"
              className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded border border-primary/50 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all duration-300"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-foreground"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
          >
            <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
              {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    title={`SimPilot.AI ${item.label} — AI pilot training module`}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                  >
                    {item.live && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400/40 animate-pulse" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_6px_1.5px_rgba(34,197,94,0.5)]" />
                      </span>
                    )}
                    {item.label}
                  </Link>
              ))}
              {!isInstalled && (
                <button
                  onClick={() => { handleInstall(); setIsOpen(false); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                >
                  <Download size={14} />
                  Install App
                </button>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  {studyTrack && <StudyTrackBadge track={studyTrack} onClick={() => setIsOpen(false)} />}
                </div>
                <Link
                  to={user ? "/dashboard" : "/auth"}
                  onClick={() => setIsOpen(false)}
                  title={user ? "Access your SimPilot.AI pilot training dashboard" : "Sign in to SimPilot.AI — start your AI pilot training"}
                  className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded text-center"
                >
                  {user ? "Dashboard" : "Sign In"}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
