import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PilotContext } from "@/hooks/usePilotContext";

const EMAIL_KEY = "simpilot_lead_email";

export function hasLeadEmail(): boolean {
  return !!localStorage.getItem(EMAIL_KEY);
}

export function saveLeadEmail(email: string) {
  localStorage.setItem(EMAIL_KEY, email);
}

interface EmailGateProps {
  pilotContext: PilotContext;
  onComplete: () => void;
}

const EmailGate = ({ pilotContext, onComplete }: EmailGateProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await supabase.from("lead_emails" as any).insert({
        email: email.trim(),
        pilot_context: pilotContext as any,
      });

      saveLeadEmail(email.trim());
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3 px-4"
    >
      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
        <Mail className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Almost there!</p>
        <p className="text-xs text-muted-foreground mt-1">
          Enter your email to unlock free AI flight training chat
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="your@email.com"
          className="flex-1 bg-secondary/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 border border-border/40"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={!isValid || loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 hover:shadow-[0_0_15px_hsl(var(--cyan-glow)/0.3)] transition-all"
        >
          {loading ? "…" : <>Start <ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[10px] text-muted-foreground/60">No spam. We respect your privacy.</p>
    </motion.div>
  );
};

export default EmailGate;
