import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  icon: LucideIcon;
  label: string;
  score: number; // 0-100
  trend?: number; // optional delta
  accent?: "cyan" | "amber";
  href?: string;
}

const CategoryCard = ({ icon: Icon, label, score, trend, accent = "cyan", href }: Props) => {
  const color = accent === "amber" ? "hsl(var(--amber-instrument))" : "hsl(var(--cyan-glow))";

  const inner = (
    <>
      {/* corner ticks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />

      <div className="flex items-center justify-between mb-3">
        <div
          className="w-11 h-11 rounded-md flex items-center justify-center border"
          style={{
            borderColor: `${color}55`,
            background: `linear-gradient(135deg, ${color}22, transparent)`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {typeof trend === "number" && (
          <span
            className="font-display text-xs font-semibold tracking-wider tabular-nums"
            style={{ color: trend >= 0 ? "hsl(var(--hud-green))" : "hsl(var(--destructive))" }}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}
          </span>
        )}
      </div>

      <div className="font-display text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground">
        {label}
      </div>

      <div className="flex items-baseline gap-1 mt-1.5">
        <span
          className="font-display text-4xl font-bold tabular-nums"
          style={{ color, textShadow: `0 0 14px ${color}40` }}
        >
          {score}
        </span>
        <span className="font-display text-sm font-semibold text-muted-foreground">/100</span>
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
    </>
  );

  const interactiveCls = href
    ? "cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_24px_hsl(var(--cyan-glow)/0.25)] focus:outline-none focus:ring-2 focus:ring-primary/60"
    : "";

  if (href) {
    return (
      <Link
        to={href}
        aria-label={`${label} — open Ground School`}
        className={`g3000-bezel rounded-lg p-4 relative overflow-hidden group block ${interactiveCls}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="g3000-bezel rounded-lg p-4 relative overflow-hidden group">{inner}</div>
  );
};

export default CategoryCard;
