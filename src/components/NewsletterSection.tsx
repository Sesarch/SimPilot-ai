import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, Mail, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NewsletterSection = () => {
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
        body: { email: trimmed, source: "homepage_newsletter_form" },
      })
      .catch((err) => console.warn("Omnisend sync failed:", err));
  };

  return (
    <section className="relative py-24 overflow-hidden border-t border-border/60">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-background" />
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(hsl(var(--primary))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary))_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] -z-10 rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute top-0 left-0 right-0 hud-line opacity-30" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Card */}
          <div className="relative rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.45)]">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            {/* Corner brackets */}
            <span className="absolute top-3 left-3 w-3 h-3 border-l border-t border-primary/60" />
            <span className="absolute top-3 right-3 w-3 h-3 border-r border-t border-primary/60" />
            <span className="absolute bottom-3 left-3 w-3 h-3 border-l border-b border-primary/60" />
            <span className="absolute bottom-3 right-3 w-3 h-3 border-r border-b border-primary/60" />

            <div className="px-6 sm:px-12 py-12 sm:py-14 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="font-display text-[10px] sm:text-xs tracking-[0.3em] uppercase text-primary">
                  Pilot Briefings
                </span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground mb-4 leading-tight">
                Fly Smarter.{" "}
                <span className="text-primary text-glow-cyan">Study Sharper.</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mb-8 leading-relaxed max-w-xl mx-auto">
                Join thousands of pilots getting monthly aviation tips, study
                guides, and SimPilot updates — straight to your inbox. No spam,
                ever.
              </p>

              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg border border-primary/40 bg-primary/10 text-primary font-display text-sm tracking-wider"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Cleared for takeoff — you're on the list!</span>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
                >
                  <div className="relative flex-1 group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      required
                      maxLength={255}
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 rounded-lg border border-primary/30 bg-background/80 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-7 bg-primary text-primary-foreground font-display text-xs tracking-widest uppercase rounded-lg border border-primary/50 hover:shadow-[0_0_30px_hsl(var(--cyan-glow)/0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Subscribe
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Trust row */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs text-muted-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary/70" />
                  No spam, ever
                </span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>Unsubscribe anytime</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>Monthly cadence</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
