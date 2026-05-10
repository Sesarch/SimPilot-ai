import { useEffect, useRef, useState, useCallback } from "react";
import {
  LayoutDashboard, CreditCard, FileBarChart, Users, ScrollText, AlertTriangle,
  Sparkles, GraduationCap, Mail, Brain, BookOpen, Globe, Settings,
  ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TABS: Array<{ value: string; label: string; Icon: LucideIcon }> = [
  { value: "overview", label: "Overview", Icon: LayoutDashboard },
  { value: "payments", label: "Payments", Icon: CreditCard },
  { value: "reports", label: "Reports", Icon: FileBarChart },
  { value: "users", label: "Users", Icon: Users },
  { value: "audit", label: "Audit", Icon: ScrollText },
  { value: "errors", label: "Errors", Icon: AlertTriangle },
  { value: "leads", label: "Leads", Icon: Sparkles },
  { value: "schools", label: "Schools", Icon: GraduationCap },
  { value: "emails", label: "Emails", Icon: Mail },
  { value: "models", label: "Models", Icon: Brain },
  { value: "kb", label: "Knowledge", Icon: BookOpen },
  { value: "seo", label: "SEO", Icon: Globe },
  { value: "settings", label: "Settings", Icon: Settings },
];

/**
 * Admin tab strip with responsive overflow handling.
 *
 * - <lg: horizontal scroll with edge-fade gradients and chevron scroll buttons
 *   that appear only when the strip overflows and the user can still scroll
 *   that direction.
 * - ≥lg: classic 13-column grid; scroll controls and fades are hidden.
 *
 * Keyboard nav still works via Radix Tabs (arrow keys, Home/End). The active
 * tab is also auto-scrolled into view when the value changes.
 */
export function AdminTabsStrip() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 4);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  // Scroll active tab into view when it changes (e.g. via deep-link).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-state="active"]');
    if (active) {
      active.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    }
  });

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative mb-8">
      {/* Left chevron */}
      <button
        type="button"
        aria-label="Scroll tabs left"
        tabIndex={-1}
        onClick={() => scrollBy(-240)}
        className={cn(
          "absolute left-0 top-1/2 z-20 -translate-y-1/2 lg:hidden",
          "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur transition-opacity",
          canLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Edge fades — only visible on small screens when scrollable that way */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-10 h-full w-8 rounded-l-lg bg-gradient-to-r from-background to-transparent transition-opacity lg:hidden",
          canLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 top-0 z-10 h-full w-8 rounded-r-lg bg-gradient-to-l from-background to-transparent transition-opacity lg:hidden",
          canRight ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        ref={scrollerRef}
        className={cn(
          // Horizontal scroll container on small screens; grid takes over at lg.
          "overflow-x-auto lg:overflow-visible",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm",
        )}
      >
        <TabsList
          className={cn(
            "h-auto p-1.5 gap-1 bg-transparent border-0",
            // Small screens: inline-flex strip wider than viewport, scrolls.
            "inline-flex w-max",
            // Desktop: full-width 13-column grid.
            "lg:grid lg:w-full lg:grid-cols-13",
          )}
        >
          {TABS.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-1.5 px-2.5 py-1.5 text-[13px] font-medium tracking-normal text-muted-foreground rounded-md transition-all duration-150 hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Right chevron */}
      <button
        type="button"
        aria-label="Scroll tabs right"
        tabIndex={-1}
        onClick={() => scrollBy(240)}
        className={cn(
          "absolute right-0 top-1/2 z-20 -translate-y-1/2 lg:hidden",
          "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur transition-opacity",
          canRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
