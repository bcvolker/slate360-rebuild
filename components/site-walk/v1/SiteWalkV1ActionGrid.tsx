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
    <div className={cn("grid grid-cols-3 gap-3 px-4 py-3", className)}>
      {actions.map(({ id, label, icon: Icon, onClick }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-zinc-300 transition-colors hover:border-amber-500/30 hover:bg-white/10 hover:text-white"
        >
          <Icon className="size-6 text-amber-500" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
