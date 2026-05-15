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
    <div className={cn("flex min-h-0 flex-1 flex-col px-4 pb-2", className)}>
      <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-9 w-full shrink-0 bg-white/5">
          {tabDefs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabDefs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-2 min-h-0 flex-1 overflow-y-auto"
          >
            {contentMap[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
