import { motion } from "framer-motion";
import { Check, GraduationCap, User, Gamepad2 } from "lucide-react";

const plans = [
  {
    icon: Gamepad2,
    name: "Sim Enthusiast",
    price: "$19",
    period: "/mo",
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
    price: "$49",
    period: "/mo",
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
    price: "$199",
    period: "/mo",
    description: "Enterprise solution for flight training organizations",
    features: [
      "Everything in Individual Pilot",
      "Up to 50 student accounts",
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
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => (
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

              <div className="mb-4">
                <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>

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
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
