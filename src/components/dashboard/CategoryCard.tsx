import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  score: number; // 0-100
  trend?: number; // optional delta
  accent?: "cyan" | "amber";
}

const CategoryCard = ({ icon: Icon, label, score, trend, accent = "cyan" }: Props) => {
  const color = accent === "amber" ? "hsl(var(--amber-instrument))" : "hsl(var(--cyan-glow))";
  return (
    <div className="g3000-bezel rounded-lg p-4 relative overflow-hidden group">
      {/* corner ticks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center border"
          style={{
            borderColor: `${color}55`,
            background: `linear-gradient(135deg, ${color}22, transparent)`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {typeof trend === "number" && (
          <span
            className="font-display text-[10px] tracking-wider tabular-nums"
            style={{ color: trend >= 0 ? "hsl(var(--hud-green))" : "hsl(var(--destructive))" }}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}
          </span>
        )}
      </div>

      <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
        {label}
      </div>

      <div className="flex items-baseline gap-1 mt-1">
        <span
          className="font-display text-3xl font-bold tabular-nums"
          style={{ color, textShadow: `0 0 14px ${color}40` }}
        >
          {score}
        </span>
        <span className="font-display text-xs text-muted-foreground">/100</span>
      </div>

      {/* progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            boxShadow: `0 0 10px ${color}80`,
          }}
        />
      </div>
    </div>
  );
};

export default CategoryCard;
