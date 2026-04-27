import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section id="contact" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 hud-line" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
            Ready for Takeoff?
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Start Your <span className="text-primary text-glow-cyan">AI Training</span> Today
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Join the next generation of pilots training with artificial intelligence.
            Book a demo or reach out to discuss how SimPilot.ai can transform your training program.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/intake"
              title="Start your SimPilot.AI intake — pilots and flight schools"
              aria-label="Start intake form for SimPilot.AI"
              className="px-8 py-3 bg-primary text-primary-foreground font-display text-sm font-semibold tracking-widest uppercase rounded border border-primary/50 hover:shadow-[0_0_30px_hsl(var(--cyan-glow)/0.4)] transition-all duration-300"
            >
              Get Started
            </Link>
            <a
              href="mailto:contact@simpilot.ai"
              title="Contact SimPilot.AI for questions about AI pilot training"
              aria-label="Contact SimPilot.AI support team via email"
              className="px-8 py-3 border border-accent/40 text-accent font-display text-sm font-semibold tracking-widest uppercase rounded hover:border-accent/70 hover:bg-accent/5 transition-all duration-300"
            >
              Contact Us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
