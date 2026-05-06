import { motion } from "framer-motion";
import { GraduationCap, User, Gamepad2 } from "lucide-react";
import simulatorSetup from "@/assets/simulator-setup.jpg";

const audiences = [
  {
    icon: GraduationCap,
    title: "Flight Schools",
    description:
      "Integrate AI-powered training modules into your curriculum. Reduce costs, improve student outcomes, and differentiate your program.",
    features: ["Curriculum Integration", "Batch Student Analytics", "Instructor Dashboard"],
  },
  {
    icon: User,
    title: "Individual Pilots",
    description:
      "Whether you're a student pilot or ATP, get personalized AI coaching to sharpen your skills and stay current.",
    features: ["Personal AI Coach", "Checkride Prep", "Currency Tracking"],
  },
  {
    icon: Gamepad2,
    title: "Sim Enthusiasts",
    description:
      "Turn your home simulator into a professional training tool. Real procedures, real learning, powered by AI.",
    features: ["MSFS / X-Plane Support", "Realistic Procedures", "Achievement System"],
  },
];

const AudiencesSection = () => {
  return (
    <section id="audiences" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-lg overflow-hidden border border-border border-glow-cyan"
          >
            <img
              src={simulatorSetup}
              alt="Professional home flight simulator setup with multiple monitors for AI-powered pilot training with SimPilot.AI"
              title="SimPilot.AI supports MSFS, X-Plane, and professional flight simulators"
              width={1280}
              height={720}
              loading="lazy"
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </motion.div>

          {/* Content side */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
                Who We Serve
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-foreground">
                Built for <span className="text-primary text-glow-cyan">Every Aviator</span>
              </h2>
            </motion.div>

            <div className="space-y-6">
              {audiences.map((audience, i) => (
                <motion.div
                  key={audience.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-gradient-card rounded-lg p-5 border border-border hover:border-primary/30 transition-all duration-500 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <audience.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm tracking-wider uppercase text-foreground mb-1">
                        {audience.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {audience.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {audience.features.map((f) => (
                          <span
                            key={f}
                            className="text-[10px] font-display tracking-wider uppercase px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AudiencesSection;
