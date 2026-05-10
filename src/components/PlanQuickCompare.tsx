import { motion } from "framer-motion";
import { Check, Minus, Loader2 } from "lucide-react";

type CellValue = boolean | string;

interface Row {
  label: string;
  student: CellValue;
  proPilot: CellValue;
  goldSeal: CellValue;
  flightSchool: CellValue;
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

type ColKey = keyof Omit<Row, "label">;

const columns: {
  key: ColKey;
  name: string;
  planName: string;
  tone: "muted" | "primary" | "accent";
  cta: string;
}[] = [
  { key: "student", name: "Student", planName: "Student", tone: "muted", cta: "Get started" },
  { key: "proPilot", name: "Pro Pilot", planName: "Pro Pilot", tone: "primary", cta: "Get started" },
  { key: "goldSeal", name: "Gold Seal", planName: "Gold Seal CFI", tone: "accent", cta: "Get started" },
  { key: "flightSchool", name: "Flight School", planName: "Flight School", tone: "muted", cta: "Contact sales" },
];

const Cell = ({ value }: { value: CellValue }) => {
  if (typeof value === "string") {
    return <span className="text-xs md:text-sm text-foreground">{value}</span>;
  }
  if (value) {
    return <Check className="w-4 h-4 text-primary mx-auto" aria-label="Included" />;
  }
  return <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" aria-label="Not included" />;
};

const headerToneClasses = (
  tone: "muted" | "primary" | "accent",
  selected: boolean,
) => {
  if (selected) {
    if (tone === "primary") return "text-primary border-primary/60 bg-primary/15";
    if (tone === "accent") return "text-accent border-accent/60 bg-accent/15";
    return "text-foreground border-foreground/40 bg-foreground/10";
  }
  if (tone === "primary") return "text-primary border-primary/30 bg-primary/5";
  if (tone === "accent") return "text-accent border-accent/30 bg-accent/5";
  return "text-muted-foreground border-border";
};

const cellToneClasses = (
  tone: "muted" | "primary" | "accent",
  selected: boolean,
) => {
  if (selected) {
    if (tone === "primary") return "border-primary/40 bg-primary/[0.08]";
    if (tone === "accent") return "border-accent/40 bg-accent/[0.08]";
    return "border-foreground/20 bg-foreground/[0.04]";
  }
  if (tone === "primary") return "border-primary/20 bg-primary/[0.02]";
  if (tone === "accent") return "border-accent/20 bg-accent/[0.02]";
  return "border-border/50";
};

interface PlanQuickCompareProps {
  selectedPlanName?: string | null;
  loadingPlanName?: string | null;
  onSelect?: (planName: string) => void;
}

const PlanQuickCompare = ({
  selectedPlanName = null,
  loadingPlanName = null,
  onSelect,
}: PlanQuickCompareProps) => {
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
              {columns.map((col) => {
                const isSelected = selectedPlanName === col.planName;
                return (
                  <th
                    key={col.key}
                    aria-current={isSelected ? "true" : undefined}
                    className={`p-3 md:p-4 text-center font-display text-[10px] md:text-xs tracking-widest uppercase border-l transition-colors ${headerToneClasses(col.tone, isSelected)}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{col.name}</span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[9px] tracking-widest normal-case">
                          <Check className="w-3 h-3" />
                          Selected
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.label}
                className={`border-b border-border/50 last:border-b-0 ${idx % 2 === 1 ? "bg-secondary/10" : ""}`}
              >
                <td className="p-3 md:p-4 text-sm text-secondary-foreground">{row.label}</td>
                {columns.map((col) => {
                  const isSelected = selectedPlanName === col.planName;
                  return (
                    <td
                      key={col.key}
                      className={`p-3 md:p-4 text-center border-l transition-colors ${cellToneClasses(col.tone, isSelected)}`}
                    >
                      <Cell value={row[col.key]} />
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* CTA row */}
            <tr className="border-t border-border bg-secondary/30">
              <td className="p-3 md:p-4 font-display text-[10px] md:text-xs tracking-widest uppercase text-muted-foreground">
                Action
              </td>
              {columns.map((col) => {
                const isSelected = selectedPlanName === col.planName;
                const isLoading = loadingPlanName === col.planName;
                const base =
                  "inline-flex items-center justify-center gap-1.5 h-9 w-full px-3 rounded font-display text-[10px] md:text-xs tracking-widest uppercase transition-all duration-300 disabled:cursor-not-allowed";
                const variant =
                  col.tone === "primary"
                    ? "bg-primary text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--cyan-glow)/0.4)] disabled:opacity-80"
                    : col.tone === "accent"
                    ? "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-80"
                    : "border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary disabled:opacity-80";
                return (
                  <td
                    key={col.key}
                    className={`p-3 md:p-4 border-l ${cellToneClasses(col.tone, isSelected)}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect?.(col.planName)}
                      disabled={isLoading}
                      aria-busy={isLoading}
                      className={`${base} ${variant}`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening…</span>
                        </>
                      ) : (
                        <span>{col.cta}</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
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
