"use client";

import type { ReactNode } from "react";
import { MobileTabbedPanel } from "@/components/mobile-system";
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
  className?: string;
};

/**
 * SiteWalkV1ListPanel — contained scrolling panel with tabs for Site Walk HomeView.
 *
 * Preserves the named-content-prop API so HomeView requires no changes.
 * Internally delegates to MobileTabbedPanel for consistent tab styling.
 */
export function SiteWalkV1ListPanel({
  defaultTab = "recent",
  recentContent,
  worksitesContent,
  sharedContent,
  reviewContent,
  className,
}: SiteWalkV1ListPanelProps) {
  const tabs: MobilePanelTab[] = [
    { value: "recent", label: "Recent", content: recentContent },
    { value: "worksites", label: "Worksites", content: worksitesContent },
    { value: "shared", label: "Shared", content: sharedContent },
    { value: "review", label: "Needs Review", content: reviewContent },
  ];

  return (
    <MobileTabbedPanel
      tabs={tabs}
      defaultTab={defaultTab}
      minHeight="min-h-0"
      className={cn(mobileTokens.mobileListPanelHeight, className)}
      bodyClassName={mobileTokens.moduleListPanelContent}
    />
  );
}
