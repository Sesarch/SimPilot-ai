import { Link } from "react-router-dom";
import { Lock, Radio, Tower, Plane, Globe2, Radar, AlertTriangle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ATCMasteryRing from "./ATCMasteryRing";
import type { ATCCategory } from "@/hooks/useATCData";

const ICONS: Record<string, LucideIcon> = {
  "ground-operations": Radio,
  "tower-operations": Tower,
  "approach-departure": Plane,
  "center-control": Radar,
  "ctaf-uncontrolled": Globe2,
  "emergency-phraseology": AlertTriangle,
};

interface Props {
  category: ATCCategory;
  masteryScore: number;
  drillsAttempted: number;
  totalDrills: number;
  locked?: boolean;
}

const ATCCategoryCard = ({ category, masteryScore, drillsAttempted, totalDrills, locked }: Props) => {
  const Icon = ICONS[category.slug] ?? Radio;

  const inner = (
    <div
      className={cn(
        "relative h-full rounded-lg border bg-card/50 p-4 sm:p-5 transition-all",
        locked
          ? "opacity-60 cursor-not-allowed border-border"
          : "border-border hover:border-accent/60 hover:bg-card/80 hover:shadow-[0_0_24px_-12px_hsl(var(--accent)/0.6)]"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <h3 className="font-display text-sm sm:text-base uppercase tracking-wider text-foreground truncate">
            {category.name}
          </h3>
        </div>
        {locked ? (
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        ) : (
          <ATCMasteryRing value={masteryScore} size={48} strokeWidth={4} />
        )}
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 min-h-[3em]">
        {category.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        {locked ? (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-accent/40 text-accent">
            Instrument Rating required
          </Badge>
        ) : (
          <span className="text-[11px] sm:text-xs text-muted-foreground tabular-nums">
            {drillsAttempted}/{totalDrills} drills
          </span>
        )}
        {!locked && (
          <span className="text-[10px] uppercase tracking-wider text-accent font-display">
            Open →
          </span>
        )}
      </div>
    </div>
  );

  if (locked) return <div aria-disabled className="block h-full">{inner}</div>;

  return (
    <Link to={`/atc/category/${category.slug}`} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
      {inner}
    </Link>
  );
};

export default ATCCategoryCard;
