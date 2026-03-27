import { motion } from "framer-motion";
import { Brain, Plane, Gauge, Radio } from "lucide-react";

const services = [
  {
    icon: Brain,
    title: "AI Flight Analysis",
    description:
      "Real-time AI analysis of your flight performance with personalized feedback and improvement recommendations.",
  },
  {
    icon: Plane,
    title: "Scenario Training",
    description:
      "Dynamic AI-generated training scenarios including weather challenges, emergencies, and complex approaches.",
  },
  {
    icon: Gauge,
    title: "Performance Tracking",
    description:
      "Comprehensive dashboards tracking progress, proficiency metrics, and certification readiness scores.",
  },
  {
    icon: Radio,
    title: "ATC Simulation",
    description:
      "AI-powered air traffic control simulation for realistic communication training in any airspace.",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 hud-line" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            What We Offer
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
            AI-Driven <span className="text-primary text-glow-cyan">Services</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-card rounded-lg p-6 border border-border hover:border-primary/30 hover:border-glow-cyan transition-all duration-500 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <service.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-sm font-semibold tracking-wider uppercase text-foreground mb-3">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
