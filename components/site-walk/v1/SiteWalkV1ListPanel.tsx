"use client";

import type { ReactNode } from "react";
import { MobileExpandableTabbedPanel } from "@/components/mobile-system";
import { mobileTokens } from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { cn } from "@/lib/utils";

export type ListTab = "recent" | "worksites" | "shared" | "review";

type SiteWalkV1ListPanelProps = {
  defaultTab?: ListTab;
  recentContent: ReactNode;
  worksitesContent: ReactNode;
  sharedContent: ReactNode;
  reviewContent: ReactNode;
  /** Page content above the dock (module intro + action grid). */
  upper?: ReactNode;
  className?: string;
};

/**
 * SiteWalkV1ListPanel — expandable tabbed dock for Site Walk HomeView.
 * Uses the same MobileExpandableTabbedPanel primitive as /app.
 */
export function SiteWalkV1ListPanel({
  defaultTab = "recent",
  recentContent,
  worksitesContent,
  sharedContent,
  reviewContent,
  upper,
  className,
}: SiteWalkV1ListPanelProps) {
  const tabs: MobilePanelTab[] = [
    { value: "recent", label: "Recent", content: recentContent },
    { value: "worksites", label: "Worksites", content: worksitesContent },
    { value: "shared", label: "Shared", content: sharedContent },
    { value: "review", label: "Needs Review", content: reviewContent },
  ];

  return (
    <MobileExpandableTabbedPanel
      tabs={tabs}
      defaultTab={defaultTab}
      upper={upper}
      className={cn("min-h-0 flex-1", className)}
      bodyClassName={mobileTokens.moduleListPanelContent}
    />
  );
}
