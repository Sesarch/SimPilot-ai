import { Shield, Award, Clock, Users, BookOpen, Plane } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: Shield, label: "FAR/AIM Referenced", description: "Every answer backed by regulations" },
  { icon: Award, label: "ACS Standards", description: "Aligned with FAA testing criteria" },
  { icon: Clock, label: "24/7 Availability", description: "Train anytime, anywhere" },
  { icon: Users, label: "1,000+ Student Pilots", description: "Trusted by learners worldwide" },
  { icon: BookOpen, label: "All Certificate Levels", description: "Private through Commercial" },
  { icon: Plane, label: "Real DPE Scenarios", description: "Checkride-style oral exams" },
];

const TrustBadges = () => {
  return (
    <section className="py-12 bg-muted/50" aria-label="Trust badges and credentials">
      <div className="container mx-auto px-4">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8"
        >
          Trusted by Student Pilots Everywhere
        </motion.p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors" title={badge.description}>
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight">{badge.label}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{badge.description}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
