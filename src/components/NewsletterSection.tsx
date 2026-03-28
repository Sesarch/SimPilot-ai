import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";
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
  };

  return (
    <section className="py-20 relative border-t border-border">
      <div className="absolute top-0 left-0 right-0 hud-line opacity-30" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Stay in the Loop
          </p>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">
            Pilot <span className="text-primary text-glow-cyan">Briefings</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed">
            Get aviation tips, study guides, and SimPilot updates delivered to
            your inbox. No spam — just useful flight knowledge.
          </p>

          {subscribed ? (
            <div className="flex items-center justify-center gap-2 text-primary font-display text-sm tracking-wider">
              <CheckCircle className="w-5 h-5" />
              <span>You're on the list — cleared for takeoff!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                maxLength={255}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-11 rounded border border-border bg-background/60 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-11 px-6 bg-primary text-primary-foreground font-display text-xs font-semibold tracking-widest uppercase rounded border border-primary/50 hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.3)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Subscribe
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
