import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveAcsTask } from "@/data/acsTasks";
import { supabase } from "@/integrations/supabase/client";

// In-memory dedupe so each unknown code only auto-logs once per page load
const loggedMissingCodes = new Set<string>();

const logMissingCode = async (code: string) => {
  const key = code.trim().toUpperCase();
  if (!key || loggedMissingCodes.has(key)) return;
  loggedMissingCodes.add(key);
  try {
    await (supabase.rpc as any)("log_missing_acs_code", { _code: key });
  } catch {
    // Best-effort: never break the UI if logging fails
    loggedMissingCodes.delete(key);
  }
};

interface AcsCodeChipProps {
  code: string;
  onClick?: (code: string) => void;
  className?: string;
}

type CertMeta = { label: string; full: string; className: string };

// Color-coded certificate level badges. Uses semantic tokens via inline
// HSL utility classes so they adapt to light/dark themes automatically.
const CERT_META: Record<string, CertMeta> = {
  PA: { label: "PA", full: "Private Pilot Airplane", className: "bg-primary/15 text-primary border-primary/30" },
  IR: { label: "IR", full: "Instrument Rating", className: "bg-accent/15 text-accent border-accent/30" },
  CA: { label: "CA", full: "Commercial Airplane", className: "bg-secondary text-secondary-foreground border-border" },
  FI: { label: "FI", full: "Flight Instructor (CFI)", className: "bg-destructive/15 text-destructive border-destructive/30" },
  ATP: { label: "ATP", full: "Airline Transport Pilot", className: "bg-foreground/10 text-foreground border-foreground/20" },
  "ATP-CTP": { label: "CTP", full: "ATP Certification Training Program", className: "bg-muted text-muted-foreground border-border" },
};

const getCertPrefix = (code: string): string | null => {
  const upper = code.trim().toUpperCase();
  if (upper.startsWith("ATP-CTP.")) return "ATP-CTP";
  const prefix = upper.split(".")[0];
  return CERT_META[prefix] ? prefix : null;
};

/**
 * Pill-style chip for an FAA ACS task code with hover tooltip showing
 * the task title and description. Renders a small certificate-level badge
 * (PA / IR / CA / FI / ATP / CTP) next to the code so users can instantly
 * see which checkride a code belongs to.
 */
export const AcsCodeChip = ({ code, onClick, className }: AcsCodeChipProps) => {
  const info = resolveAcsTask(code);
  const certPrefix = getCertPrefix(code);
  const cert = certPrefix ? CERT_META[certPrefix] : null;
  const label = info ? `${code}: ${info.task}` : `${code}: Unknown ACS task`;
  const subtext = info?.description || (info?.area ? `Area: ${info.area}` : "No description available.");

  // Auto-log unknown codes so admins can backfill the lookup table
  useEffect(() => {
    if (!info) void logMissingCode(code);
  }, [code, info]);

  const handleReportMissing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prefill = `Hi — I noticed the ACS code "${code}" isn't recognized in SimPilot's task lookup. Could you add a description for it?`;
    window.dispatchEvent(
      new CustomEvent("simpilot:open-support", { detail: { message: prefill } }),
    );
  };

  const chip = (
    <span
      className={`inline-flex items-center gap-1 ${onClick ? "cursor-pointer" : "cursor-help"} ${className ?? ""}`}
    >
      {cert && (
        <span
          className={`font-display text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded border ${cert.className}`}
          aria-label={cert.full}
          title={cert.full}
        >
          {cert.label}
        </span>
      )}
      <Badge
        variant="secondary"
        className="font-mono text-[11px] hover:bg-secondary/80 transition-colors"
      >
        {code}
      </Badge>
    </span>
  );

  const content = (
    <TooltipContent side="top" className="max-w-xs">
      <div className="space-y-1">
        {cert && (
          <p className="text-[10px] uppercase tracking-wider opacity-70 ">{cert.full}</p>
        )}
        <p className="font-display text-xs">{label}</p>
        {info?.area && <p className="text-[10px] uppercase tracking-wider opacity-70">{info.area}</p>}
        <p className="text-[11px] leading-snug">{subtext}</p>
        {onClick && info && <p className="text-[10px] italic opacity-70 pt-1">Click to drill this task</p>}
        {!info && (
          <button
            type="button"
            onClick={handleReportMissing}
            className="text-[10px] underline text-primary hover:text-primary/80 pt-1 cursor-pointer pointer-events-auto"
          >
            Report missing code →
          </button>
        )}
      </div>
    </TooltipContent>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {onClick ? (
            <button
              type="button"
              onClick={() => onClick(code)}
              className="inline-flex"
              aria-label={label}
            >
              {chip}
            </button>
          ) : (
            <span className="inline-flex" aria-label={label}>{chip}</span>
          )}
        </TooltipTrigger>
        {content}
      </Tooltip>
    </TooltipProvider>
  );
};
