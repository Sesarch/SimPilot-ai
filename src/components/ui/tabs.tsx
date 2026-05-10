import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Stronger container so the strip reads in dark mode against the page bg.
      // min-h-10 (not fixed h-10) lets multi-row grid TabsLists stay consistent
      // without squishing triggers; triggers themselves enforce their own height.
      "inline-flex min-h-10 items-center justify-center rounded-md border border-border/70 bg-card/70 p-1 text-muted-foreground backdrop-blur-sm",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Idle: brighter than muted-foreground (5.99:1 → ~8:1 against bg).
      // Active: subtle pill + a primary underline pinned to the label area
      // (after:left-3/right-3 mirrors the px-3 padding) so on wrapped rows the
      // bar always sits flush under the label, not the full pill.
      // !min-h-8 + !leading-none use the important modifier so per-page overrides
      // (e.g. AdminPage's `font-display text-xs tracking-wider`) can't drop the
      // height lock and reintroduce the vertical-compression bug.
      "relative inline-flex !min-h-8 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium !leading-none text-foreground/70 ring-offset-background transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground after:pointer-events-none after:absolute after:left-3 after:right-3 after:bottom-1 after:h-[2px] after:rounded-full after:bg-primary after:opacity-0 after:scale-x-75 after:origin-center after:transition-[opacity,transform] after:duration-200 data-[state=active]:after:opacity-100 data-[state=active]:after:scale-x-100",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // Subtle fade+lift on activation. `motion-reduce` honours user prefs.
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:animate-fade-in motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
