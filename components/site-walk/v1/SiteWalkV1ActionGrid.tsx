"use client";

import { Plus, Play, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionItem = {
  id: string;
  label: string;
  icon: typeof Plus;
  onClick: () => void;
};

type SiteWalkV1ActionGridProps = {
  onNewWorksite?: () => void;
  onStartWalk?: () => void;
  onQuickCapture?: () => void;
  className?: string;
};

export function SiteWalkV1ActionGrid({
  onNewWorksite,
  onStartWalk,
  onQuickCapture,
  className,
}: SiteWalkV1ActionGridProps) {
  const actions: ActionItem[] = [
    {
      id: "create-worksite",
      label: "Create Worksite",
      icon: Plus,
      onClick: onNewWorksite ?? (() => {}),
    },
    {
      id: "walk-from-worksite",
      label: "Walk from Worksite",
      icon: Play,
      onClick: onStartWalk ?? (() => {}),
    },
    {
      id: "quick-walk",
      label: "Quick Walk",
      icon: Camera,
      onClick: onQuickCapture ?? (() => {}),
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2.5 px-4 py-2", className)}>
      {actions.map(({ id, label, icon: Icon, onClick }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          className="flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-2 text-zinc-300 transition-colors hover:border-amber-500/25 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
        >
          <Icon className="size-6 text-amber-500" />
          <span className="text-[13px] font-medium leading-tight text-center">{label}</span>
        </button>
      ))}
    </div>
  );
}
