/**
 * Visual-regression guard for admin tabs.
 *
 * jsdom doesn't compute layout, so we can't measure offsetHeight directly.
 * Instead we lock in the height-stabilising utility classes that prevent the
 * vertical compression bug we hit when triggers were stretched by grid
 * TabsLists or shrunk by `font-display` line-heights.
 *
 * If any of these classes get removed from `src/components/ui/tabs.tsx`, this
 * test fails — catching the regression before release.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REQUIRED_LIST_CLASSES = ["min-h-10"];
// `!` modifier survives tailwind-merge so per-page overrides (e.g. text-xs,
// font-display) can't drop the height lock.
const REQUIRED_TRIGGER_CLASSES = ["!min-h-8", "!leading-none", "px-3", "py-1.5"];

describe("Admin tabs — vertical compression guard", () => {
  it("TabsList keeps a min-height so multi-row grids don't squish triggers", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = container.querySelector('[role="tablist"]')!;
    for (const cls of REQUIRED_LIST_CLASSES) {
      expect(list.className, `TabsList missing "${cls}"`).toContain(cls);
    }
  });

  it("every TabsTrigger keeps height-locking classes regardless of label or extra classes", () => {
    // Mimic the real admin variants: short labels, long labels, and the
    // `font-display tracking-wider` overrides used on AdminPage.
    const { container } = render(
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13">
          <TabsTrigger value="overview" className="font-display text-xs tracking-wider">
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="font-display text-xs tracking-wider">
            Payments
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="long">A Much Longer Label</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const triggers = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(triggers.length).toBeGreaterThan(0);

    for (const trigger of triggers) {
      for (const cls of REQUIRED_TRIGGER_CLASSES) {
        expect(
          trigger.className,
          `TabsTrigger "${trigger.textContent}" missing "${cls}" — vertical compression risk`,
        ).toContain(cls);
      }
    }
  });

  it("active-state styling stays on the trigger (visual cue must survive refactors)", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const triggers = Array.from(container.querySelectorAll('[role="tab"]'));
    for (const trigger of triggers) {
      expect(trigger.className).toContain("data-[state=active]:bg-background");
      expect(trigger.className).toContain("data-[state=active]:text-foreground");
    }
  });
});
