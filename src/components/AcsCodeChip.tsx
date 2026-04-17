import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveAcsTask } from "@/data/acsTasks";

interface AcsCodeChipProps {
  code: string;
  onClick?: (code: string) => void;
  className?: string;
}

/**
 * Pill-style chip for an FAA ACS task code with hover tooltip showing
 * the task title and description. Optionally clickable to drill the code.
 * Unknown codes show a "Report missing code" link in the tooltip that
 * opens the support chat pre-filled with the code.
 */
export const AcsCodeChip = ({ code, onClick, className }: AcsCodeChipProps) => {
  const info = resolveAcsTask(code);
  const label = info ? `${code}: ${info.task}` : `${code}: Unknown ACS task`;
  const subtext = info?.description || (info?.area ? `Area: ${info.area}` : "No description available.");

  const handleReportMissing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prefill = `Hi — I noticed the ACS code "${code}" isn't recognized in SimPilot's task lookup. Could you add a description for it?`;
    window.dispatchEvent(
      new CustomEvent("simpilot:open-support", { detail: { message: prefill } }),
    );
  };

  const chip = (
    <Badge
      variant="secondary"
      className={`font-mono text-[11px] cursor-${onClick ? "pointer" : "help"} hover:bg-secondary/80 transition-colors ${className ?? ""}`}
    >
      {code}
    </Badge>
  );

  const content = (
    <TooltipContent side="top" className="max-w-xs">
      <div className="space-y-1">
        <p className="font-display font-bold text-xs">{label}</p>
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
