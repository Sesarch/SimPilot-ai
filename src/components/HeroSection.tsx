import { motion } from "framer-motion";
import heroCockpit from "@/assets/hero-cockpit.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroCockpit}
          alt="Aircraft cockpit view at sunset"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        <div className="absolute inset-0 scanline-overlay" />
      </div>

      {/* HUD decorative lines */}
      <div className="absolute top-1/4 left-0 right-0 hud-line opacity-40" />
      <div className="absolute top-3/4 left-0 right-0 hud-line opacity-20" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="font-display text-xs md:text-sm tracking-[0.3em] uppercase text-primary mb-6 text-glow-cyan">
            AI-Powered Flight Training
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
        >
          <span className="text-foreground">Your AI </span>
          <span className="text-primary text-glow-cyan">Co-Pilot</span>
          <br />
          <span className="text-foreground">for </span>
          <span className="text-accent text-glow-amber">Flight Mastery</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          SimPilot.ai brings cutting-edge artificial intelligence to pilot training.
          Whether you're a flight school, professional pilot, or sim enthusiast — we
          accelerate your journey to the skies.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="#contact"
            className="px-8 py-3 bg-primary text-primary-foreground font-display text-sm font-semibold tracking-widest uppercase rounded border border-primary/50 hover:shadow-[0_0_30px_hsl(var(--cyan-glow)/0.4)] transition-all duration-300"
          >
            Start Training
          </a>
          <a
            href="#services"
            className="px-8 py-3 border border-muted-foreground/30 text-foreground font-display text-sm font-semibold tracking-widest uppercase rounded hover:border-primary/50 hover:text-primary transition-all duration-300"
          >
            Explore Services
          </a>
        </motion.div>

        {/* HUD-style stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 grid grid-cols-3 max-w-lg mx-auto gap-6"
        >
          {[
            { value: "500+", label: "Pilots Trained" },
            { value: "98%", label: "Success Rate" },
            { value: "24/7", label: "AI Support" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl font-bold text-primary text-glow-cyan">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
