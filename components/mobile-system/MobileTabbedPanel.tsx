"use client";

/**
 * MobileTabbedPanel — shared contained scrolling tab panel for mobile shells.
 */

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

export interface MobilePanelTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface MobileTabbedPanelProps {
  tabs: MobilePanelTab[];
  defaultTab?: string;
  id?: string;
  className?: string;
  minHeight?: string;
  bodyClassName?: string;
  showBottomFade?: boolean;
  bottomFadeClassName?: string;
  tabTriggerClassName?: string;
}

export function MobileTabbedPanel({
  tabs,
  defaultTab,
  id,
  className,
  minHeight = "min-h-[260px]",
  bodyClassName,
  showBottomFade = true,
  bottomFadeClassName,
  tabTriggerClassName,
}: MobileTabbedPanelProps) {
  const defaultValue = defaultTab ?? tabs[0]?.value ?? "";

  return (
    <div id={id} className={cn(mobileTokens.panelBase, minHeight, className)}>
      <Tabs defaultValue={defaultValue} className="flex min-h-0 flex-1 flex-col">
        <div className={mobileTokens.panelTabStripWrapper}>
          <TabsList className={mobileTokens.panelTabList}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={tabTriggerClassName ?? mobileTokens.panelTabTrigger}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={cn(
              "mt-0 min-h-0 data-[state=inactive]:hidden",
              mobileTokens.panelContent,
              bodyClassName,
            )}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {showBottomFade && (
        <div
          className={cn(
            bottomFadeClassName ?? mobileTokens.panelBottomFade,
          )}
        />
      )}
    </div>
  );
}
