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
      className="w-full max-w-xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0"
    >
      <div className="relative py-2 sm:py-3">

        <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-2 sm:mb-3">
          <Sparkles className="w-3 h-3 text-primary shrink-0" />
          <span className="font-display text-[10px] sm:text-xs md:text-sm tracking-[0.25em] sm:tracking-[0.3em] uppercase text-primary text-glow-cyan text-center sm:text-left">
            Pilot Briefings — Free Monthly Newsletter
          </span>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-3" />

        {subscribed ? (
          <div className="flex items-center justify-center gap-2 py-1.5 text-primary font-display text-xs sm:text-sm tracking-wider text-glow-cyan text-center">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Cleared for takeoff — you're on the list!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="relative flex-1 group w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                required
                maxLength={255}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 sm:h-10 rounded-md border border-primary/30 bg-background/70 pl-9 pr-3 font-sans text-sm sm:text-base md:text-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-11 sm:h-10 px-5 bg-primary text-primary-foreground font-display text-[11px] tracking-widest uppercase rounded-md border border-primary/50 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.4)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
