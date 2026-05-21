"use client";

import { Plus, Play, Camera, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileActionCard, MobileActionGrid } from "@/components/mobile-system";

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
    <MobileActionGrid className={cn(className)} data-testid="site-walk-action-grid">
      <MobileActionCard
        variant="module"
        label="Create Worksite"
        icon={Plus}
        onClick={onNewWorksite ?? (() => {})}
      />
      <MobileActionCard
        variant="module"
        label="Walk from Worksite"
        icon={Play}
        onClick={onStartWalk ?? (() => {})}
      />
      <MobileActionCard
        variant="module"
        label="Quick Walk"
        icon={Camera}
        onClick={onQuickCapture ?? (() => {})}
      />
      <MobileActionCard
        variant="module"
        label="Search"
        icon={Search}
        onClick={onSearch ?? (() => {})}
      />
    </MobileActionGrid>
  );
}
