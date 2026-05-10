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
      // Active: real elevation — primary-tinted ring + shadow so the pill pops.
      // min-h-8 + leading-none locks every trigger to the same height regardless
      // of label length, font-display tracking, or grid stretching.
      "inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium leading-none text-foreground/70 ring-offset-background transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_0_1px_hsl(var(--primary)/0.45),0_2px_8px_-2px_hsl(var(--primary)/0.35)]",
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
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
