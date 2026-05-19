"use client";

import { Plus, Play, Camera, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileActionCard } from "@/components/mobile-system/MobileActionCard";
import { MobileActionGrid } from "@/components/mobile-system/MobileActionGrid";

type SiteWalkV1ActionGridProps = {
  onNewWorksite?: () => void;
  onStartWalk?: () => void;
  onQuickCapture?: () => void;
  onSearch?: () => void;
  className?: string;
};

export function SiteWalkV1ActionGrid({
  onNewWorksite,
  onStartWalk,
  onQuickCapture,
  onSearch,
  className,
}: SiteWalkV1ActionGridProps) {
  return (
    <MobileActionGrid className={cn("px-4", className)}>
      <MobileActionCard label="Create Worksite" icon={Plus} onClick={onNewWorksite ?? (() => {})} />
      <MobileActionCard label="Walk from Worksite" icon={Play} onClick={onStartWalk ?? (() => {})} />
      <MobileActionCard label="Quick Walk" icon={Camera} onClick={onQuickCapture ?? (() => {})} />
      <MobileActionCard label="Search" icon={Search} onClick={onSearch ?? (() => {})} />
    </MobileActionGrid>
  );
}
