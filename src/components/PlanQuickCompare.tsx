import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";

type Cell = boolean | string;

interface Row {
  label: string;
  student: Cell;
  proPilot: Cell;
  goldSeal: Cell;
  flightSchool: Cell;
}

const rows: Row[] = [
  {
    label: "Best for",
    student: "Pre-checkride",
    proPilot: "Active pilots",
    goldSeal: "CFIs & power users",
    flightSchool: "Schools (10+ seats)",
  },
  {
    label: "Price",
    student: "$29/mo",
    proPilot: "$59/mo",
    goldSeal: "$99/mo",
    flightSchool: "$39/seat/mo",
  },
  {
    label: "AI coaching",
    student: "20/day",
    proPilot: "Unlimited",
    goldSeal: "Unlimited",
    flightSchool: "Unlimited",
  },
  {
    label: "POH & chart analysis",
    student: false,
    proPilot: true,
    goldSeal: true,
    flightSchool: true,
  },
  {
    label: "Sim debrief (.FLT)",
    student: false,
    proPilot: true,
    goldSeal: true,
    flightSchool: true,
  },
  {
    label: "Priority support",
    student: false,
    proPilot: true,
    goldSeal: "24/7 1-on-1",
    flightSchool: true,
  },
];

const columns: { key: keyof Omit<Row, "label">; name: string; tone: "muted" | "primary" | "accent" }[] = [
  { key: "student", name: "Student", tone: "muted" },
  { key: "proPilot", name: "Pro Pilot", tone: "primary" },
  { key: "goldSeal", name: "Gold Seal", tone: "accent" },
  { key: "flightSchool", name: "Flight School", tone: "muted" },
];

const Cell = ({ value }: { value: Cell }) => {
  if (typeof value === "string") {
    return <span className="text-xs md:text-sm text-foreground">{value}</span>;
  }
  if (value) {
    return <Check className="w-4 h-4 text-primary mx-auto" aria-label="Included" />;
  }
  return <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" aria-label="Not included" />;
};

const toneClasses = (tone: "muted" | "primary" | "accent") => {
  if (tone === "primary") return "text-primary border-primary/30 bg-primary/5";
  if (tone === "accent") return "text-accent border-accent/30 bg-accent/5";
  return "text-muted-foreground border-border";
};

const PlanQuickCompare = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-5xl mx-auto mt-12"
    >
      <div className="text-center mb-6">
        <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-2">
          Quick Compare
        </p>
        <h3 className="font-display text-xl md:text-2xl text-foreground">
          Pick the right tier in <span className="text-primary">30 seconds</span>
        </h3>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-3 md:p-4 font-display text-[10px] md:text-xs tracking-widest uppercase text-muted-foreground">
                At a glance
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3 md:p-4 text-center font-display text-[10px] md:text-xs tracking-widest uppercase border-l ${toneClasses(col.tone)}`}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.label}
                className={`border-b border-border/50 last:border-b-0 ${idx % 2 === 1 ? "bg-secondary/10" : ""}`}
              >
                <td className="p-3 md:p-4 text-sm text-secondary-foreground">{row.label}</td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`p-3 md:p-4 text-center border-l ${
                      col.tone === "primary"
                        ? "border-primary/20 bg-primary/[0.02]"
                        : col.tone === "accent"
                        ? "border-accent/20 bg-accent/[0.02]"
                        : "border-border/50"
                    }`}
                  >
                    <Cell value={row[col.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">
        Need the full breakdown? See the detailed comparison below.
      </p>
    </motion.div>
  );
};

export default PlanQuickCompare;
