"use client";

import type { ReactNode } from "react";
import { SiteWalkV1Header } from "./SiteWalkV1Header";
import {
  SiteWalkV1BottomNav,
  type V1NavTab,
} from "./SiteWalkV1BottomNav";
import { cn } from "@/lib/utils";

type SiteWalkV1ShellProps = {
  title: string;
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
  onBack?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  overflowActions?: { label: string; onClick: () => void; destructive?: boolean }[];
  showBottomNav?: boolean;
  children: ReactNode;
  className?: string;
};

export function SiteWalkV1Shell({
  title,
  activeTab,
  onTabChange,
  onBack,
  primaryAction,
  overflowActions,
  showBottomNav = true,
  children,
  className,
}: SiteWalkV1ShellProps) {
  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-950">
      <SiteWalkV1Header
        title={title}
        onBack={onBack}
        primaryAction={primaryAction}
        overflowActions={overflowActions}
      />

      <main className={cn("flex-1 overflow-y-auto", className)}>
        {children}
      </main>

      {showBottomNav && (
        <SiteWalkV1BottomNav
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
}
