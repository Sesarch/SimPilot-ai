import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ATCDrill } from "@/hooks/useATCData";

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: "border-[hsl(var(--hud-green,142_70%_45%))]/50 text-[hsl(var(--hud-green,142_70%_45%))]",
  intermediate: "border-accent/50 text-accent",
  advanced: "border-destructive/50 text-destructive",
};

interface Props {
  drill: ATCDrill;
  categorySlug: string;
  bestScore: number | null;
}

const ATCDrillCard = ({ drill, categorySlug, bestScore }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3 sm:p-4 hover:border-accent/60 hover:bg-card/70 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-sm uppercase tracking-wider text-foreground truncate">
            {drill.title}
          </h4>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", DIFFICULTY_STYLES[drill.difficulty] ?? "")}>
              {drill.difficulty}
            </Badge>
            {bestScore !== null && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                Best: <span className="text-foreground font-medium">{bestScore}</span>
              </span>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="border-accent/60 text-accent hover:bg-accent/10 shrink-0">
          <Link to={`/atc/category/${categorySlug}/drill/${drill.id}`}>
            <Play className="h-3.5 w-3.5 mr-1" />
            Practice
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ATCDrillCard;
