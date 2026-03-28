import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

type CellValue = boolean | string;

interface ComparisonRow {
  feature: string;
  simEnthusiast: CellValue;
  individualPilot: CellValue;
  flightSchool: CellValue;
}

const categories: { title: string; rows: ComparisonRow[] }[] = [
  {
    title: "AI Coaching & Training",
    rows: [
      { feature: "AI flight coaching sessions", simEnthusiast: "50/mo", individualPilot: "Unlimited", flightSchool: "Unlimited" },
      { feature: "Socratic teaching method", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "FAR/AIM/ACS references", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Priority AI response time", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "VFR/IFR chart image analysis", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "Custom training scenarios", simEnthusiast: false, individualPilot: false, flightSchool: true },
    ],
  },
  {
    title: "Exam Preparation",
    rows: [
      { feature: "Ground school study modules", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Oral exam simulator", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "Checkride prep modules", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "Practice knowledge tests", simEnthusiast: "Basic", individualPilot: "Full bank", flightSchool: "Full bank" },
      { feature: "Exam score tracking & history", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Certificate types covered", simEnthusiast: "PPL", individualPilot: "PPL, IR, CPL", flightSchool: "All ratings" },
    ],
  },
  {
    title: "Simulator Integration",
    rows: [
      { feature: "MSFS 2020/2024 integration", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "X-Plane 12 integration", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Procedure training library", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "ATC communication trainer", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "Instrument procedure drills", simEnthusiast: false, individualPilot: true, flightSchool: true },
    ],
  },
  {
    title: "Progress & Analytics",
    rows: [
      { feature: "Performance tracking dashboard", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Topic-by-topic progress", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Session history & review", simEnthusiast: "Last 30 days", individualPilot: "Unlimited", flightSchool: "Unlimited" },
      { feature: "Currency & logbook tracking", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "Batch student analytics", simEnthusiast: false, individualPilot: false, flightSchool: true },
    ],
  },
  {
    title: "Organization & Admin",
    rows: [
      { feature: "User accounts included", simEnthusiast: "1", individualPilot: "1", flightSchool: "Up to 20" },
      { feature: "Instructor admin dashboard", simEnthusiast: false, individualPilot: false, flightSchool: true },
      { feature: "Curriculum integration API", simEnthusiast: false, individualPilot: false, flightSchool: true },
      { feature: "White-label option", simEnthusiast: false, individualPilot: false, flightSchool: true },
      { feature: "Dedicated account manager", simEnthusiast: false, individualPilot: false, flightSchool: true },
      { feature: "Community access", simEnthusiast: true, individualPilot: true, flightSchool: true },
    ],
  },
  {
    title: "Support",
    rows: [
      { feature: "Email support", simEnthusiast: true, individualPilot: true, flightSchool: true },
      { feature: "Priority support", simEnthusiast: false, individualPilot: true, flightSchool: true },
      { feature: "Onboarding assistance", simEnthusiast: false, individualPilot: false, flightSchool: true },
      { feature: "SLA & uptime guarantee", simEnthusiast: false, individualPilot: false, flightSchool: "99.9%" },
    ],
  },
];

const CellContent = ({ value }: { value: CellValue }) => {
  if (typeof value === "string") {
    return <span className="text-xs font-medium text-foreground">{value}</span>;
  }
  if (value === true) {
    return <Check className="w-4 h-4 text-primary mx-auto" />;
  }
  return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
};

const PlanComparisonTable = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-20 max-w-5xl mx-auto"
    >
      <div className="text-center mb-10">
        <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Compare <span className="text-primary text-glow-cyan">Plans</span> in Detail
        </h3>
        <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto">
          See exactly what's included in each plan so you can choose the right fit for your training goals.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
        {/* Sticky header */}
        <div className="grid grid-cols-4 border-b border-border bg-secondary/50 sticky top-0 z-10">
          <div className="p-4 text-left">
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">Feature</span>
          </div>
          <div className="p-4 text-center border-l border-border">
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">Sim Enthusiast</span>
          </div>
          <div className="p-4 text-center border-l border-primary/30 bg-primary/5">
            <span className="font-display text-xs tracking-widest uppercase text-primary font-bold">Individual Pilot</span>
          </div>
          <div className="p-4 text-center border-l border-border">
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">Flight School</span>
          </div>
        </div>

        {categories.map((category) => (
          <div key={category.title}>
            {/* Category header */}
            <div className="grid grid-cols-4 border-b border-border bg-secondary/30">
              <div className="col-span-4 p-3 px-4">
                <span className="font-display text-xs font-bold tracking-wider uppercase text-accent">
                  {category.title}
                </span>
              </div>
            </div>

            {/* Feature rows */}
            {category.rows.map((row, idx) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 border-b border-border/50 hover:bg-secondary/20 transition-colors ${
                  idx % 2 === 0 ? "" : "bg-secondary/10"
                }`}
              >
                <div className="p-3 px-4 flex items-center">
                  <span className="text-sm text-secondary-foreground">{row.feature}</span>
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-border/50">
                  <CellContent value={row.simEnthusiast} />
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-primary/20 bg-primary/[0.02]">
                  <CellContent value={row.individualPilot} />
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-border/50">
                  <CellContent value={row.flightSchool} />
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Bottom CTA row */}
        <div className="grid grid-cols-4 border-t border-border bg-secondary/30">
          <div className="p-4" />
          <div className="p-4 text-center border-l border-border">
            <a
              href="#contact"
              className="inline-block px-4 py-2 rounded font-display text-[10px] font-semibold tracking-widest uppercase border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              Start Flying
            </a>
          </div>
          <div className="p-4 text-center border-l border-primary/30 bg-primary/5">
            <a
              href="#contact"
              className="inline-block px-4 py-2 rounded font-display text-[10px] font-semibold tracking-widest uppercase bg-primary text-primary-foreground hover:shadow-[0_0_25px_hsl(var(--cyan-glow)/0.4)] transition-all"
            >
              Go Pro
            </a>
          </div>
          <div className="p-4 text-center border-l border-border">
            <a
              href="#contact"
              className="inline-block px-4 py-2 rounded font-display text-[10px] font-semibold tracking-widest uppercase border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PlanComparisonTable;
