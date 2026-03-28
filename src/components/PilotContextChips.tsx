import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { PilotContext } from "@/hooks/usePilotContext";

const FIELDS: {
  key: keyof PilotContext;
  label: string;
  icon: string;
  options: string[];
}[] = [
  {
    key: "certificate_type",
    label: "Certificate",
    icon: "🎓",
    options: ["Student", "Sport", "Private (PPL)", "Commercial (CPL)", "CFI / CFII", "ATP", "General"],
  },
  {
    key: "aircraft_type",
    label: "Aircraft",
    icon: "✈️",
    options: ["Single-Engine", "Multi-Engine", "Helicopter", "Glider", "General"],
  },
  {
    key: "rating_focus",
    label: "Rating",
    icon: "📋",
    options: ["VFR", "IFR / Instrument", "Multi-Engine", "Sim Enthusiast", "General"],
  },
  {
    key: "region",
    label: "Region",
    icon: "🌍",
    options: ["United States", "Canada", "Europe (EASA)", "Other", "General"],
  },
  {
    key: "flight_hours",
    label: "Flight Hours",
    icon: "⏱️",
    options: ["0–50", "50–150", "150–500", "500+", "General"],
  },
];

interface PilotContextChipsProps {
  context: PilotContext;
  onSelect: (field: keyof PilotContext, value: string) => void;
  compact?: boolean;
}

const PilotContextChips = ({ context, onSelect, compact = false }: PilotContextChipsProps) => {
  const unsetFields = FIELDS.filter((f) => !context[f.key]);

  if (unsetFields.length === 0) return null;

  // Show one field at a time for a step-by-step feel
  const currentField = unsetFields[0];
  const completedCount = FIELDS.length - unsetFields.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-2"
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {FIELDS.map((f, i) => (
          <div
            key={f.key}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < completedCount
                ? "bg-primary"
                : i === completedCount
                ? "bg-primary/50"
                : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      <p className={`text-center text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
        {currentField.icon} Select your <span className="text-foreground font-medium">{currentField.label}</span>
        {completedCount > 0 && (
          <span className="text-muted-foreground/60"> ({completedCount}/{FIELDS.length})</span>
        )}
      </p>

      <div className={`flex flex-wrap justify-center ${compact ? "gap-1.5" : "gap-2"}`}>
        <AnimatePresence mode="popLayout">
          {currentField.options.map((option) => (
            <motion.button
              key={option}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onSelect(currentField.key, option)}
              className={`${
                compact ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5"
              } rounded-full transition-all ${
                option === "General"
                  ? "border border-dashed border-muted-foreground/40 text-muted-foreground/70 hover:border-muted-foreground/60 hover:text-muted-foreground italic"
                  : "border border-border/60 hover:border-primary/50 hover:bg-primary/10 text-foreground/80 hover:text-foreground"
              }`}
            >
              {option === "General" ? "Skip · General" : option}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/** Compact inline display of current selections with edit capability */
export const PilotContextBadge = ({
  context,
  onClear,
}: {
  context: PilotContext;
  onClear: (field: keyof PilotContext) => void;
}) => {
  const set = FIELDS.filter((f) => context[f.key]);
  if (set.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 justify-center">
      {set.map((f) => (
        <button
          key={f.key}
          onClick={() => onClear(f.key)}
          title={`Click to change ${f.label}`}
          className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
        >
          {f.icon} {context[f.key]}
        </button>
      ))}
    </div>
  );
};

export default PilotContextChips;
