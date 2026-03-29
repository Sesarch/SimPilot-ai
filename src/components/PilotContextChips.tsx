import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, X } from "lucide-react";
import { PilotContext } from "@/hooks/usePilotContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FieldDef {
  key: keyof PilotContext;
  label: string;
  icon: string;
  options: string[];
  note?: string;
}

const REGION_FIELD: FieldDef = {
  key: "region",
  label: "Region",
  icon: "🌍",
  options: ["United States (FAA)", "Europe (EASA)", "Canada (TC)", "ICAO / Other"],
};

const CERTIFICATE_BY_REGION: Record<string, string[]> = {
  "United States (FAA)": ["Sport Pilot", "Private Pilot (PPL)", "Commercial (CPL)", "CFI / CFII", "ATP"],
  "Europe (EASA)": ["LAPL", "PPL", "CPL", "IR", "ATPL"],
  "Canada (TC)": ["Recreational", "Private (PPL)", "Commercial (CPL)", "Instructor", "ATPL"],
  "ICAO / Other": ["Private (PPL)", "Commercial (CPL)", "Instrument Rating", "ATPL"],
};

const RATING_BY_REGION: Record<string, string[]> = {
  "United States (FAA)": ["VFR", "IFR / Instrument", "Multi-Engine", "Sim Enthusiast"],
  "Europe (EASA)": ["VFR", "IFR", "Multi-Engine (MEP)", "Night Rating"],
  "Canada (TC)": ["VFR", "IFR", "Multi-Engine", "Night Rating"],
  "ICAO / Other": ["VFR", "IFR", "Multi-Engine", "General"],
};

const AIRCRAFT_OPTIONS = [
  "Cessna 152",
  "Cessna 172",
  "Piper Archer II",
  "Piper Archer III",
  "Diamond DA20",
  "Diamond DA40",
  "Cirrus SR20",
  "Cirrus SR22",
  "Other",
];

const FLIGHT_HOURS_OPTIONS = ["0–50", "50–150", "150–500", "500+", "General"];

function getFields(context: PilotContext): FieldDef[] {
  const region = context.region || "";
  const certs = CERTIFICATE_BY_REGION[region] || CERTIFICATE_BY_REGION["United States (FAA)"];
  const ratings = RATING_BY_REGION[region] || RATING_BY_REGION["United States (FAA)"];

  return [
    REGION_FIELD,
    {
      key: "certificate_type",
      label: "Certificate",
      icon: "🎓",
      options: [...certs, "General"],
    },
    {
      key: "rating_focus",
      label: "Rating",
      icon: "📋",
      options: [...ratings, "General"],
    },
    {
      key: "aircraft_type",
      label: "Aircraft",
      icon: "✈️",
      options: [...AIRCRAFT_OPTIONS, "General"],
      note: "Uploading POH is not required. However, if you would like to receive more accurate answers based on your actual training aircraft, please upload your aircraft's POH.",
    },
    {
      key: "flight_hours",
      label: "Flight Hours",
      icon: "⏱️",
      options: FLIGHT_HOURS_OPTIONS,
    },
  ];
}

interface PilotContextChipsProps {
  context: PilotContext;
  onSelect: (field: keyof PilotContext, value: string) => void;
  onPOHUpload?: (file: File) => void;
  onPOHClear?: () => void;
  pohUploaded?: boolean;
  compact?: boolean;
}

const PilotContextChips = ({ context, onSelect, onPOHUpload, onPOHClear, pohUploaded = false, compact = false }: PilotContextChipsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fields = getFields(context);
  const unsetFields = fields.filter((f) => !context[f.key]);

  if (unsetFields.length === 0) return null;

  const currentField = unsetFields[0];
  const completedCount = fields.length - unsetFields.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-2"
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {fields.map((f, i) => (
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
          <span className="text-muted-foreground/60"> ({completedCount}/{fields.length})</span>
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

      {/* POH upload note for aircraft step */}
      {currentField.note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center text-muted-foreground/60 italic ${compact ? "text-[10px] px-3" : "text-[11px] px-4"}`}
        >
          {pohUploaded ? (
            <p className="flex items-center justify-center gap-1.5 not-italic">
              <CheckCircle2 className={`text-hud-green ${compact ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
              <span className="text-hud-green font-medium">POH uploaded</span>
              <span className="text-muted-foreground/50">— AI responses will reference your aircraft manual.</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary/70 hover:text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors font-medium ml-1"
              >
                Replace
              </button>
              {onPOHClear && (
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="text-destructive/60 hover:text-destructive underline underline-offset-2 decoration-destructive/30 hover:decoration-destructive/60 transition-colors font-medium ml-1"
                >
                  Remove
                </button>
              )}
            </p>
          ) : (
            <p>
              Uploading POH is not required. However, if you would like to receive more accurate answers based on your actual training aircraft, please{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-0.5 text-primary/80 hover:text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors not-italic font-medium"
              >
                <Upload className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                upload your aircraft's POH
              </button>.
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onPOHUpload) onPOHUpload(file);
              e.target.value = "";
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

/** Compact inline display of current selections with edit capability */
export const PilotContextBadge = ({
  context,
  onClear,
  pohUploaded = false,
  onPOHClear,
}: {
  context: PilotContext;
  onClear: (field: keyof PilotContext) => void;
  pohUploaded?: boolean;
  onPOHClear?: () => void;
}) => {
  const fields = getFields(context);
  const set = fields.filter((f) => context[f.key]);
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
      {pohUploaded && (
        <button
          onClick={onPOHClear}
          title="Click to remove POH"
          className="text-[9px] px-2 py-0.5 rounded-full bg-hud-green/10 text-hud-green border border-hud-green/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors flex items-center gap-1"
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          POH
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};

export default PilotContextChips;
