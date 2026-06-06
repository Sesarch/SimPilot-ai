import { cn } from "@/lib/utils";

interface Props {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

const ATCMasteryRing = ({ value, size = 56, strokeWidth = 5, className, label }: Props) => {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safe / 100) * c;

  const colorClass =
    safe >= 80 ? "text-[hsl(var(--hud-green,142_70%_45%))]" :
    safe >= 50 ? "text-accent" :
    "text-muted-foreground";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="hsl(var(--border))" strokeWidth={strokeWidth} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="currentColor" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className={cn("transition-all duration-500", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("font-display text-sm tabular-nums", colorClass)}>{safe}</span>
        {label && <span className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>}
      </div>
    </div>
  );
};

export default ATCMasteryRing;
