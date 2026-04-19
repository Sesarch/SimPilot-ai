import { useEffect, useState } from "react";

interface Props {
  score: number; // 0–100
  label?: string;
}

const ReadinessGauge = ({ score, label = "Overall Readiness" }: Props) => {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const size = 280;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 270° (3/4 of circle). Gap at the bottom.
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const dashOffset = arcLength - (animated / 100) * arcLength;

  // Color shifts by score
  const color =
    score >= 85 ? "hsl(var(--hud-green))" : score >= 60 ? "hsl(var(--amber-instrument))" : "hsl(var(--destructive))";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-[225deg]">
        <defs>
          <linearGradient id="readinessGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Value */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#readinessGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          filter="url(#glow)"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)" }}
        />
        {/* Tick marks */}
        {Array.from({ length: 11 }).map((_, i) => {
          const angle = (i / 10) * 270 - 135; // -135° to 135° (relative to rotated svg)
          const rad = (angle * Math.PI) / 180;
          const inner = radius - stroke / 2 - 4;
          const outer = radius - stroke / 2 - 12;
          const x1 = size / 2 + Math.cos(rad) * inner;
          const y1 = size / 2 + Math.sin(rad) * inner;
          const x2 = size / 2 + Math.cos(rad) * outer;
          const y2 = size / 2 + Math.sin(rad) * outer;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--muted-foreground) / 0.5)"
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-[12px] font-semibold tracking-[0.3em] uppercase text-foreground/80">
          {label}
        </span>
        <div className="flex items-baseline gap-1 mt-2">
          <span
            className="font-display text-7xl font-extrabold tabular-nums"
            style={{ color, textShadow: `0 0 24px ${color}` }}
          >
            {Math.round(animated)}
          </span>
          <span className="font-display text-xl font-semibold text-muted-foreground">/100</span>
        </div>
        <span
          className="font-display text-[12px] font-bold tracking-[0.28em] uppercase mt-2"
          style={{ color, textShadow: `0 0 12px ${color}80` }}
        >
          {score >= 85 ? "Checkride Ready" : score >= 60 ? "Building Proficiency" : "Needs Focus"}
        </span>
      </div>
    </div>
  );
};

export default ReadinessGauge;
