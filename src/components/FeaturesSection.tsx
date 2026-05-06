import { motion } from "framer-motion";
import { Zap, Shield, Globe, Clock, BarChart3, Headphones } from "lucide-react";

const features = [
  { icon: Zap, title: "Real-Time AI Feedback", desc: "Instant performance analysis during every session" },
  { icon: Shield, title: "Safety Focused", desc: "ADM & CRM training aligned with FAA standards" },
  { icon: Globe, title: "Any Aircraft, Anywhere", desc: "Support for GA, commercial, and military platforms" },
  { icon: Clock, title: "Train Anytime", desc: "24/7 access to AI training modules on your schedule" },
  { icon: BarChart3, title: "Progress Analytics", desc: "Deep insights into your strengths and weak areas" },
  { icon: Headphones, title: "Dedicated Support", desc: "Expert aviation team backing every AI interaction" },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative bg-gradient-hero scroll-mt-20">
      <div className="absolute top-0 left-0 right-0 hud-line" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Why SimPilot.ai
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            The <span className="text-primary text-glow-cyan">Advantage</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-4 p-5 rounded-lg border border-border/50 hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-xs tracking-wider uppercase text-foreground mb-1">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
