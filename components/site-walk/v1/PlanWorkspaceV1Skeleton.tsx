"use client";

import { Layers, Search, MapPin, Grid3X3 } from "lucide-react";
import { SiteWalkV1Header } from "./SiteWalkV1Header";
import { cn } from "@/lib/utils";

type PlanWorkspaceV1SkeletonProps = {
  worksiteName?: string;
  walkTitle?: string;
  onBack?: () => void;
  className?: string;
};

const toolbarItems = [
  { id: "sheets", icon: Grid3X3, label: "Sheets" },
  { id: "search", icon: Search, label: "Search" },
  { id: "pins", icon: MapPin, label: "Pins" },
  { id: "layers", icon: Layers, label: "Layers" },
] as const;

export function PlanWorkspaceV1Skeleton({
  worksiteName = "Worksite",
  walkTitle = "Walk",
  onBack,
  className,
}: PlanWorkspaceV1SkeletonProps) {
  const headerTitle = `${worksiteName} — ${walkTitle}`;

  return (
    <div className={cn("flex h-[100dvh] flex-col bg-zinc-950", className)}>
      <SiteWalkV1Header
        title={headerTitle}
        onBack={onBack}
        primaryAction={{ label: "Capture", onClick: () => {} }}
      />

      {/* Canvas zone — full remaining height */}
      <div className="relative flex-1 bg-zinc-900">
        {/* Sheet rail placeholder — top compact strip */}
        <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center gap-2 border-b border-white/5 bg-zinc-950/80 px-3 backdrop-blur-sm">
          <span className="text-xs font-medium text-zinc-400">Sheet 1</span>
          <span className="text-xs text-zinc-600">/</span>
          <span className="text-xs text-zinc-600">3 sheets</span>
        </div>

        {/* Canvas placeholder */}
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-zinc-600">Plan canvas area</p>
        </div>
      </div>

      {/* Bottom tools bar */}
      <div className="flex h-12 items-stretch border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm">
        {toolbarItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
