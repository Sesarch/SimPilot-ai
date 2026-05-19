import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HeroNewsletterInline = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed });
    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.info("You're already subscribed!");
        setSubscribed(true);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    setSubscribed(true);
    toast.success("You're subscribed! Welcome aboard ✈️");

    supabase.functions
      .invoke("sync-omnisend-contact", {
        body: { email: trimmed, source: "hero_inline_newsletter" },
      })
      .catch((err) => console.warn("Omnisend sync failed:", err));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.55 }}
      className="max-w-xl mx-auto mb-8"
    >
      <div className="relative rounded-xl border border-primary/30 bg-background/40 backdrop-blur-md px-4 sm:px-5 py-3 shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.5)]">
        {/* Corner brackets */}
        <span className="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t border-primary/60" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t border-primary/60" />
        <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b border-primary/60" />
        <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b border-primary/60" />

        <div className="flex items-center gap-1.5 mb-2 justify-center sm:justify-start">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-primary">
            Pilot Briefings — Free Monthly Newsletter
          </span>
        </div>

        {subscribed ? (
          <div className="flex items-center justify-center gap-2 py-1.5 text-primary font-display text-xs tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cleared for takeoff — you're on the list!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                required
                maxLength={255}
                placeholder="Enter your email for aviation tips & updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-md border border-primary/30 bg-background/70 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 bg-primary text-primary-foreground font-display text-[11px] tracking-widest uppercase rounded-md border border-primary/50 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.4)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Subscribe
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default HeroNewsletterInline;
