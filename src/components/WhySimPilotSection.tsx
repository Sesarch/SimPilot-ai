import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Target, Shield, Layers, ArrowRight, Check, X } from "lucide-react";

const pillars = [
  {
    icon: Layers,
    title: "All-in-One Platform",
    desc: "Ground school, oral exam prep, ATC training, weather briefings, flight tracking — competitors make you pay for each separately.",
    competitors: "AI CFI + Sporty's + ForeFlight = 3 apps. SimPilot.AI = 1.",
  },
  {
    icon: Brain,
    title: "Socratic CFI Voice",
    desc: "Other tools spit out answers. SimPilot.AI teaches you to think like a pilot using the Socratic method — just like a real CFI debrief.",
    competitors: "No competitor offers a dedicated teaching persona with this methodology.",
  },
  {
    icon: Target,
    title: "Only True Oral Exam Sim",
    desc: "Full DPE-style checkride simulation with adaptive questioning, scoring, pass/fail, and detailed debriefs. Nobody else does this.",
    competitors: "AI CFI has basic Q&A — not a structured exam simulation with scoring.",
  },
  {
    icon: Shield,
    title: "Aircraft-Specific Grounding",
    desc: "Upload your POH and get answers grounded in your specific aircraft — not generic responses from a general-purpose chatbot.",
    competitors: "Zero competitors offer POH upload or aircraft-specific AI coaching.",
  },
];

const quickCompare = [
  { feature: "AI Coaching + Ground One-on-One", us: true, them: false },
  { feature: "Oral Exam Simulation", us: true, them: false },
  { feature: "Live Weather & Flight Tracking", us: true, them: false },
  { feature: "POH Upload", us: true, them: false },
  { feature: "Progress & Score Tracking", us: true, them: false },
  { feature: "Single Platform, One Price", us: true, them: false },
];

const WhySimPilotSection = () => {
  return (
    <section id="why-simpilot" className="py-24 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Why SimPilot.AI
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
            Stop Juggling 5 Apps.{" "}
            <span className="text-primary">Train with One.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Other tools do one thing. SimPilot.AI is the only platform that combines
            AI coaching, ground school, oral exam prep, weather, and flight tracking
            into a single experience built for pilots.
          </p>
        </motion.div>

        {/* Pillar cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto mb-16">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-500 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base text-foreground mb-1.5">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {p.desc}
                    </p>
                    <p className="text-xs text-accent/80 italic leading-relaxed">
                      {p.competitors}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick comparison strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_80px_80px] px-5 py-3 border-b border-border/50 bg-secondary/30">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Feature</span>
              <span className="text-xs text-primary text-center uppercase tracking-wider">SimPilot</span>
              <span className="text-xs text-muted-foreground text-center uppercase tracking-wider">Others</span>
            </div>
            {quickCompare.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_80px_80px] px-5 py-2.5 items-center ${i < quickCompare.length - 1 ? "border-b border-border/20" : ""}`}
              >
                <span className="text-sm text-foreground">{row.feature}</span>
                <div className="flex justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-destructive" strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            to="/competitors"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline underline-offset-4 transition-colors"
          >
            See the full competitor breakdown <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default WhySimPilotSection;
