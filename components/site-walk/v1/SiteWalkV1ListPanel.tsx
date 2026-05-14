"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ListTab = "recent" | "active" | "shared" | "review";

type SiteWalkV1ListPanelProps = {
  defaultTab?: ListTab;
  recentContent: ReactNode;
  activeContent: ReactNode;
  sharedContent: ReactNode;
  reviewContent: ReactNode;
  className?: string;
};

const tabDefs: { value: ListTab; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "active", label: "Active" },
  { value: "shared", label: "Shared" },
  { value: "review", label: "Needs Review" },
];

export function SiteWalkV1ListPanel({
  defaultTab = "recent",
  recentContent,
  activeContent,
  sharedContent,
  reviewContent,
  className,
}: SiteWalkV1ListPanelProps) {
  const contentMap: Record<ListTab, ReactNode> = {
    recent: recentContent,
    active: activeContent,
    shared: sharedContent,
    review: reviewContent,
  };

  return (
    <div className={cn("flex flex-1 flex-col px-4 pb-2", className)}>
      <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col">
        <TabsList className="h-9 w-full bg-white/5">
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
            className="mt-2 flex-1"
          >
            {contentMap[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
