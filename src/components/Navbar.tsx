import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { label: "Why SimPilot.AI", href: "/why-simpilot", isRoute: true },
  { label: "Ground School", href: "/ground-school", isRoute: true },
  { label: "Oral Exam", href: "/oral-exam", isRoute: true },
  { label: "Live Tools", href: "/live-tools", isRoute: true, live: true },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
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
        <a href="#" className="flex items-center gap-2" title="SimPilot.AI — AI-Powered Pilot Training Home" aria-label="Go to SimPilot.AI homepage">
          <span className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
            SIM<span className="text-accent">PILOT</span>.AI
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) =>
            item.isRoute ? (
              <Link
                key={item.label}
                to={item.href}
                title={`SimPilot.AI ${item.label} — AI pilot training module`}
                className="relative flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300 tracking-wide uppercase"
              >
                {item.live && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                )}
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                title={`View ${item.label} — SimPilot.AI aviation training`}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300 tracking-wide uppercase"
              >
                {item.label}
              </a>
            )
          )}
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
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                  >
                    {item.label}
                  </a>
                )
              )}
              {!isInstalled && (
                <button
                  onClick={() => { handleInstall(); setIsOpen(false); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                >
                  <Download size={14} />
                  Install App
                </button>
              )}
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <Link
                  to={user ? "/dashboard" : "/auth"}
                  onClick={() => setIsOpen(false)}
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
