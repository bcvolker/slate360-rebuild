"use client";

/**
 * MobileTabbedPanel — shared contained scrolling tab panel for mobile shells.
 *
 * Replaces:
 *  - Inline Tabs/activity panel in CommandCenterContent (/app)
 *  - SiteWalkV1ListPanel (/site-walk)
 *
 * Uses Radix UI Tabs primitive (same as existing shell components) for
 * proper keyboard navigation and accessibility.
 *
 * Slice 1: component created only. No consumers changed yet.
 */

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

export interface MobilePanelTab {
  /** Unique key used by Radix Tabs. */
  value: string;
  label: string;
  content: ReactNode;
}

interface MobileTabbedPanelProps {
  tabs: MobilePanelTab[];
  /**
   * Which tab to show initially.
   * Defaults to the first tab if omitted.
   */
  defaultTab?: string;
  className?: string;
  /**
   * Minimum panel height.
   * Defaults to "min-h-[260px]" to match both shell's current render.
   */
  minHeight?: string;
}

export function MobileTabbedPanel({
  tabs,
  defaultTab,
  className,
  minHeight = "min-h-[260px]",
}: MobileTabbedPanelProps) {
  const defaultValue = defaultTab ?? tabs[0]?.value ?? "";

  return (
    <div className={cn(mobileTokens.panelBase, minHeight, className)}>
      <Tabs defaultValue={defaultValue} className="flex min-h-0 flex-1 flex-col">
        {/* Tab strip */}
        <div className={mobileTokens.panelTabStripWrapper}>
          <TabsList className={mobileTokens.panelTabList}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={mobileTokens.panelTabTrigger}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Scrollable content areas */}
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={mobileTokens.panelContent}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bottom fade — scroll affordance */}
      <div className={mobileTokens.panelBottomFade} />
    </div>
  );
}
