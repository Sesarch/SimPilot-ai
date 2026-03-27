import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "Ground School", href: "/ground-school", isRoute: true },
  { label: "Oral Exam", href: "/oral-exam", isRoute: true },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-primary text-glow-cyan tracking-wider">
            SIM<span className="text-accent">PILOT</span>.AI
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300 tracking-wide uppercase"
            >
              {item.label}
            </a>
          ))}
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded border border-primary/50 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
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
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to={user ? "/dashboard" : "/auth"}
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded text-center"
              >
                {user ? "Dashboard" : "Sign In"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
