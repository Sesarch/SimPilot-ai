import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

type CellValue = boolean | string;

interface ComparisonRow {
  feature: string;
  student: CellValue;
  proPilot: CellValue;
  goldSeal: CellValue;
  flightSchool: CellValue;
}

const categories: { title: string; rows: ComparisonRow[] }[] = [
  {
    title: "AI Coaching & Training",
    rows: [
      { feature: "AI coaching sessions", student: "20/day", proPilot: "Unlimited", goldSeal: "Unlimited", flightSchool: "Unlimited" },
      { feature: "Socratic teaching method", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "FAR/AIM/ACS references", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Priority AI response time", student: false, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "POH upload & aircraft coaching", student: false, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Multi-aircraft POH library", student: false, proPilot: false, goldSeal: true, flightSchool: true },
      { feature: "VFR/IFR chart image analysis", student: false, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Custom training scenarios", student: false, proPilot: false, goldSeal: true, flightSchool: true },
      { feature: "Personalized study plan", student: false, proPilot: false, goldSeal: true, flightSchool: false },
    ],
  },
  {
    title: "Exam Preparation",
    rows: [
      { feature: "19 Ground School modules", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Oral Exam simulator", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Checkride prep modules", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Exam score tracking & history", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Advanced checkride readiness analytics", student: false, proPilot: false, goldSeal: true, flightSchool: true },
      { feature: "Certificate types covered", student: "PPL", proPilot: "PPL, IR, CPL", goldSeal: "All ratings", flightSchool: "All ratings" },
    ],
  },
  {
    title: "Live Tools & Sim Integration",
    rows: [
      { feature: "Live Flight Tracker", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Weather briefing (METAR/TAF)", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "ATC communication trainer", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Sim debrief (.FLT upload)", student: false, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Instrument procedure drills", student: false, proPilot: true, goldSeal: true, flightSchool: true },
    ],
  },
  {
    title: "Progress & Analytics",
    rows: [
      { feature: "Performance tracking dashboard", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Topic-by-topic progress", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Session history", student: "30 days", proPilot: "Unlimited", goldSeal: "Unlimited", flightSchool: "Unlimited" },
      { feature: "Batch student analytics", student: false, proPilot: false, goldSeal: false, flightSchool: true },
    ],
  },
  {
    title: "Organization & Support",
    rows: [
      { feature: "Seats included", student: "1", proPilot: "1", goldSeal: "1", flightSchool: "10+" },
      { feature: "Early access to new features", student: false, proPilot: false, goldSeal: true, flightSchool: false },
      { feature: "Instructor admin dashboard", student: false, proPilot: false, goldSeal: false, flightSchool: true },
      { feature: "Curriculum integration API", student: false, proPilot: false, goldSeal: false, flightSchool: true },
      { feature: "White-label option", student: false, proPilot: false, goldSeal: false, flightSchool: true },
      { feature: "Dedicated account manager", student: false, proPilot: false, goldSeal: false, flightSchool: true },
      { feature: "Community access", student: true, proPilot: true, goldSeal: true, flightSchool: true },
      { feature: "Priority support", student: false, proPilot: true, goldSeal: "24/7 1-on-1", flightSchool: true },
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
      className="mt-20 max-w-6xl mx-auto"
    >
      <div className="text-center mb-10">
        <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Compare <span className="text-primary text-glow-cyan">Plans</span> in Detail
        </h3>
        <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto">
          See exactly what's included in each plan so you can choose the right fit for your training goals.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto">
        {/* Sticky header */}
        <div className="grid grid-cols-5 min-w-[700px] border-b border-border bg-secondary/50 sticky top-0 z-10">
          <div className="p-4 text-left">
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">Feature</span>
          </div>
          <div className="p-4 text-center border-l border-border">
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">Student</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">$29/mo</p>
          </div>
          <div className="p-4 text-center border-l border-primary/30 bg-primary/5">
            <span className="font-display text-xs tracking-widest uppercase text-primary font-bold">Pro Pilot</span>
            <p className="text-[10px] text-primary/70 mt-0.5">$59/mo</p>
          </div>
          <div className="p-4 text-center border-l border-accent/30 bg-accent/5">
            <span className="font-display text-xs tracking-widest uppercase text-accent font-bold">Gold Seal CFI</span>
            <p className="text-[10px] text-accent/70 mt-0.5">$99/mo</p>
          </div>
          <div className="p-4 text-center border-l border-border">
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">Flight School</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">$39/seat/mo</p>
          </div>
        </div>

        {categories.map((category) => (
          <div key={category.title}>
            <div className="grid grid-cols-5 min-w-[700px] border-b border-border bg-secondary/30">
              <div className="col-span-5 p-3 px-4">
                <span className="font-display text-xs font-bold tracking-wider uppercase text-accent">
                  {category.title}
                </span>
              </div>
            </div>

            {category.rows.map((row, idx) => (
              <div
                key={row.feature}
                className={`grid grid-cols-5 min-w-[700px] border-b border-border/50 hover:bg-secondary/20 transition-colors ${
                  idx % 2 === 0 ? "" : "bg-secondary/10"
                }`}
              >
                <div className="p-3 px-4 flex items-center">
                  <span className="text-sm text-secondary-foreground">{row.feature}</span>
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-border/50">
                  <CellContent value={row.student} />
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-primary/20 bg-primary/[0.02]">
                  <CellContent value={row.proPilot} />
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-accent/20 bg-accent/[0.02]">
                  <CellContent value={row.goldSeal} />
                </div>
                <div className="p-3 text-center flex items-center justify-center border-l border-border/50">
                  <CellContent value={row.flightSchool} />
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Bottom CTA row */}
        <div className="grid grid-cols-5 min-w-[700px] border-t border-border bg-secondary/30">
          <div className="p-4" />
          <div className="p-4 text-center border-l border-border">
            <a
              href="#contact"
              className="inline-block px-4 py-2 rounded font-display text-[10px] font-semibold tracking-widest uppercase border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              Start Free Trial
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
          <div className="p-4 text-center border-l border-accent/30 bg-accent/5">
            <a
              href="#contact"
              className="inline-block px-4 py-2 rounded font-display text-[10px] font-semibold tracking-widest uppercase bg-accent text-accent-foreground hover:shadow-[0_0_25px_hsl(var(--accent)/0.4)] transition-all"
            >
              Go Gold Seal
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