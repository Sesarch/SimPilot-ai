import { Check, X, Zap, Brain, Target, Shield, BookOpen, Award, BarChart3, Clock, Headphones, Plane, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    label: "Dedicated CFI Persona",
    description: "8,000+ hr Gold Seal instructor who teaches — not just answers",
    simpilot: true,
    general: false,
    icon: Award,
  },
  {
    label: "Socratic Teaching Method",
    description: "Guides you to discover answers, just like a real CFI debrief",
    simpilot: true,
    general: false,
    icon: Brain,
  },
  {
    label: "FAR/AIM & ACS References",
    description: "Every answer cites specific regulations and ACS task codes",
    simpilot: true,
    general: false,
    icon: BookOpen,
  },
  {
    label: "DPE Oral Exam Simulation",
    description: "Structured checkride sim with scoring, debrief & pass/fail",
    simpilot: true,
    general: false,
    icon: Target,
  },
  {
    label: "Ground One-on-One Lessons",
    description: "Progressive lessons with progress tracking & comprehension checks",
    simpilot: true,
    general: false,
    icon: Zap,
  },
  {
    label: "Aviation Safety Focus",
    description: "Never compromises on accuracy; redirects medical/legal questions",
    simpilot: true,
    general: false,
    icon: Shield,
  },
  {
    label: "POH-Aware Responses",
    description: "Upload your aircraft's POH and get answers specific to your plane",
    simpilot: true,
    general: false,
    icon: Plane,
  },
  {
    label: "Progress & Score Tracking",
    description: "Track exam scores, topic mastery, and study streaks over time",
    simpilot: true,
    general: false,
    icon: BarChart3,
  },
  {
    label: "Context-Aware Sessions",
    description: "Tailors every answer to your certificate, rating, region & aircraft",
    simpilot: true,
    general: false,
    icon: MessageSquare,
  },
  {
    label: "Checkride Readiness Assessment",
    description: "Tells you when you're ready for the real exam based on performance trends",
    simpilot: true,
    general: false,
    icon: Clock,
  },
  {
    label: "Voice & Tone of a Real CFI",
    description: "Responds like a patient flight instructor — not a generic chatbot",
    simpilot: true,
    general: false,
    icon: Headphones,
  },
];

const ComparisonSection = () => {
  return (
    <section
      id="comparison"
      className="py-20 md:py-28 relative overflow-hidden"
      aria-labelledby="comparison-heading"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 mb-4">
            Why SimPilot.AI
          </span>
          <h2
            id="comparison-heading"
            className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            Not All AI Is Built to{" "}
            <span className="text-primary">Teach You to Fly</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            General AI chatbots can answer aviation questions — but SimPilot.AI
            is purpose-built to train pilots the way a real CFI would.
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_140px_140px] gap-2 md:gap-4 items-end mb-3 px-4">
            <div />
            <div className="text-center">
              <div className="inline-flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30">
                <span className="font-display text-xs md:text-sm font-bold text-primary tracking-wide">
                  SimPilot.AI
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-secondary/60 border border-border/40">
                <span className="font-display text-xs md:text-sm font-medium text-muted-foreground tracking-wide">
                  General AI
                </span>
              </div>
            </div>
          </div>

          {/* Feature rows */}
          <div className="space-y-2">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                  className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_140px_140px] gap-2 md:gap-4 items-center rounded-xl px-4 py-3 bg-card/60 border border-border/30 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {feature.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  {/* SimPilot column */}
                  <div className="flex justify-center">
                    <div
                      className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center"
                      aria-label="SimPilot.AI includes this feature"
                    >
                      <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                    </div>
                  </div>

                  {/* General AI column */}
                  <div className="flex justify-center">
                    <div
                      className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center"
                      aria-label="General AI does not include this feature"
                    >
                      <X className="w-4 h-4 text-destructive" strokeWidth={3} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-center mt-10"
          >
            <p className="text-muted-foreground text-sm mb-4">
              General AI gives you answers.{" "}
              <span className="text-primary font-semibold">
                SimPilot.AI teaches you to fly.
              </span>
            </p>
            <a
              href="#hero-chat"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.3)] transition-all"
              title="Try SimPilot.AI flight training assistant for free"
            >
              <Zap className="w-4 h-4" />
              Try It Free — No Signup Required
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonSection;
