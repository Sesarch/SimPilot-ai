import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Garmin G3000-style COM1 radio strip. Active frequency on the left in
 * cyan, standby on the right in white, with a small TX/RX status lamp.
 */
export const G3000ComRadio = ({
  facility,
  active,
  standby,
  speaking,
  ptt,
  onSwap,
  swapping,
}: {
  facility: string;
  active: string;
  standby: string;
  speaking: boolean;
  ptt: boolean;
  onSwap?: () => void;
  swapping?: boolean;
}) => {
  const status = ptt ? "TX" : speaking ? "RX" : "STBY";
  const statusColor = ptt
    ? "hsl(var(--hud-green))"
    : speaking
    ? "hsl(var(--amber-instrument))"
    : "hsl(var(--muted-foreground))";

  return (
    <div
      className="rounded-lg border border-border bg-black/85 px-4 py-3 shadow-[inset_0_0_24px_rgba(0,0,0,0.7),0_0_0_1px_hsl(var(--primary)/0.15)] relative overflow-hidden"
      role="group"
      aria-label={`COM1 radio tuned to ${facility} ${active}`}
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: statusColor,
                boxShadow: ptt || speaking ? `0 0 8px ${statusColor}` : "none",
                animation: ptt || speaking ? "pulse 1.5s ease-in-out infinite" : undefined,
              }}
            />
            <span className="font-display text-[9px] tracking-[0.3em] uppercase text-primary/80">
              COM1 · ACTIVE
            </span>
            <span className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              · {facility}
            </span>
          </div>
          <div
            className="font-mono tabular-nums leading-none text-[hsl(var(--cyan-glow))] text-3xl sm:text-4xl tracking-wider"
            style={{ textShadow: "0 0 12px hsl(var(--cyan-glow) / 0.55)" }}
          >
            {active}
          </div>
        </div>

        <div className="flex flex-col items-center px-2 sm:px-4 border-x border-border/60 self-stretch justify-center">
          <span className="font-display text-[8px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
            Status
          </span>
          <span
            className="font-display text-xs tracking-[0.25em] uppercase "
            style={{
              color: statusColor,
              textShadow: ptt || speaking ? `0 0 8px ${statusColor}` : "none",
            }}
          >
            {status}
          </span>
        </div>

        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            aria-label="Swap COM1 active and standby frequencies"
            title="Swap active ⇄ standby"
            className="group flex flex-col items-center justify-center px-2 py-1 rounded border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            <ArrowLeftRight
              className={cn(
                "h-4 w-4 text-primary transition-transform",
                swapping && "rotate-180",
              )}
            />
            <span className="font-display text-[8px] tracking-[0.25em] uppercase text-primary/70 mt-0.5">
              Swap
            </span>
          </button>
        )}

        <div className="text-right">
          <div className="font-display text-[9px] tracking-[0.3em] uppercase text-muted-foreground/80 mb-0.5">
            Standby
          </div>
          <div
            className={cn(
              "font-mono tabular-nums leading-none text-foreground/90 text-xl sm:text-2xl tracking-wider transition-opacity",
              swapping && "opacity-40",
            )}
            style={{ textShadow: "0 0 6px rgba(255,255,255,0.15)" }}
          >
            {standby}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </div>
  );
};
