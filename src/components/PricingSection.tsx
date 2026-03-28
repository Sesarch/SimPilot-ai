import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, GraduationCap, User, Gamepad2 } from "lucide-react";
import PlanComparisonTable from "./PlanComparisonTable";

const plans = [
  {
    icon: Gamepad2,
    name: "Sim Enthusiast",
    monthly: 29,
    annual: 23,
    description: "Perfect for home sim pilots who want real-world skills",
    features: [
      "AI flight coaching sessions",
      "MSFS & X-Plane integration",
      "Procedure training library",
      "Performance tracking dashboard",
      "Community access",
    ],
    cta: "Start Flying",
    highlighted: false,
  },
  {
    icon: User,
    name: "Individual Pilot",
    monthly: 79,
    annual: 63,
    description: "For student and certified pilots sharpening their edge",
    features: [
      "Everything in Sim Enthusiast",
      "Unlimited AI coaching",
      "Checkride prep modules",
      "ATC communication trainer",
      "Currency & logbook tracking",
      "Instrument procedure drills",
      "Priority AI response",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    icon: GraduationCap,
    name: "Flight School",
    monthly: 299,
    annual: 239,
    description: "Enterprise solution for flight training organizations",
    features: [
      "Everything in Individual Pilot",
      "Up to 20 student accounts",
      "Instructor admin dashboard",
      "Batch student analytics",
      "Curriculum integration API",
      "Custom training scenarios",
      "Dedicated account manager",
      "White-label option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 relative bg-gradient-hero">
      <div className="absolute top-0 left-0 right-0 hud-line" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Pricing
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
            Choose Your <span className="text-primary text-glow-cyan">Flight Plan</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Transparent pricing for every level of aviator. Start free, upgrade when you're ready.
          </p>
          <p className="mt-3 font-display text-sm font-bold tracking-wide text-primary">
            ✦ No Credit Card Required
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium transition-colors ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-7 rounded-full border border-border bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Toggle annual pricing"
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 rounded-full bg-primary shadow-md"
                animate={{ left: annual ? "calc(100% - 1.625rem)" : "0.125rem" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
            </span>
            <AnimatePresence>
              {annual && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-[10px] font-display font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25"
                >
                  Save 20%
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly;
            const period = annual ? "/mo" : "/mo";
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className={`relative flex flex-col rounded-xl p-6 border transition-all duration-500 ${
                  plan.highlighted
                    ? "border-primary/50 border-glow-cyan bg-gradient-card scale-[1.02]"
                    : "border-border bg-gradient-card hover:border-primary/20"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="font-display text-[10px] tracking-widest uppercase px-4 py-1 rounded-full bg-primary text-primary-foreground font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? "bg-primary/20" : "bg-accent/10"
                    }`}
                  >
                    <plan.icon
                      className={`w-5 h-5 ${plan.highlighted ? "text-primary" : "text-accent"}`}
                    />
                  </div>
                  <h3 className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-1 flex items-baseline gap-1">
                  <motion.span
                    key={price}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-4xl font-bold text-foreground"
                  >
                    ${price}
                  </motion.span>
                  <span className="text-muted-foreground text-sm">{period}</span>
                  {annual && (
                    <span className="text-muted-foreground text-xs line-through ml-1">
                      ${plan.monthly}
                    </span>
                  )}
                </div>
                {annual && (
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Billed ${price * 12}/year
                  </p>
                )}
                <span className="inline-block text-[10px] font-display font-semibold tracking-widest uppercase px-3 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 mb-4 w-fit">
                  7-Day Free Trial
                </span>

                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.highlighted ? "text-primary" : "text-accent"
                        }`}
                      />
                      <span className="text-secondary-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`block text-center px-6 py-3 rounded font-display text-xs font-semibold tracking-widest uppercase transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)]"
                      : "border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {plan.cta}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Value Comparison Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-16 mb-12 rounded-xl border border-primary/30 border-glow-cyan bg-gradient-card p-8"
        >
          <h3 className="font-display text-lg md:text-xl font-bold text-foreground text-center mb-6">
            How SimPilot.AI Compares to Traditional Training
          </h3>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            {/* CFI Cost */}
            <div className="text-center p-6 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-2">
                1 Hour with a CFI
              </p>
              <p className="font-display text-5xl font-bold text-destructive">$75–$150</p>
              <p className="text-sm text-muted-foreground mt-2">
                Single session · Limited availability · No 24/7 access
              </p>
            </div>
            {/* SimPilot Cost */}
            <div className="text-center p-6 rounded-lg bg-primary/10 border border-primary/30">
              <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-2">
                1 Month of SimPilot.AI
              </p>
              <p className="font-display text-5xl font-bold text-primary text-glow-cyan">$79</p>
              <p className="text-sm text-muted-foreground mt-2">
                Unlimited AI coaching · 24/7 availability · Checkride prep included
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <span className="text-accent font-semibold">That's the cost of a single CFI session</span> for an entire month of unlimited, on-demand flight training support.
          </p>
        </motion.div>

        <PlanComparisonTable />
      </div>
    </section>
  );
};

export default PricingSection;
