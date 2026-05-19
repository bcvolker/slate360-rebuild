"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const tabDefs: { value: ListTab; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "worksites", label: "Worksites" },
  { value: "shared", label: "Shared" },
  { value: "review", label: "Needs Review" },
];

export function SiteWalkV1ListPanel({
  defaultTab = "recent",
  recentContent,
  worksitesContent,
  sharedContent,
  reviewContent,
  className,
}: SiteWalkV1ListPanelProps) {
  const contentMap: Record<ListTab, ReactNode> = {
    recent: recentContent,
    worksites: worksitesContent,
    shared: sharedContent,
    review: reviewContent,
  };

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]",
        className,
      )}
    >
      <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
        {/* Tab strip */}
        <div className="shrink-0 border-b border-white/5 px-3">
          <TabsList className="h-9 w-full bg-transparent p-0">
            {tabDefs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[12px] font-medium text-zinc-500 transition-colors data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Scrollable content area */}
        {tabDefs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-6"
          >
            {contentMap[tab.value]}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bottom fade — scroll affordance */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0B0F15]/90 to-transparent" />
    </div>
  );
}
