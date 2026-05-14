"use client";

import { MapPin } from "lucide-react";
import { SiteWalkV1RowMenu, type RowAction } from "./SiteWalkV1RowMenu";
import { cn } from "@/lib/utils";

type WorksiteV1RowProps = {
  name: string;
  walkCount: number;
  lastActivity: string | null;
  onOpen: () => void;
  onStartWalk: () => void;
  onPlanRoom: () => void;
  onSlateDrop: () => void;
  onRename?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
};

export function WorksiteV1Row({
  name,
  walkCount,
  lastActivity,
  onOpen,
  onStartWalk,
  onPlanRoom,
  onSlateDrop,
  onRename,
  onArchive,
  onDelete,
  className,
}: WorksiteV1RowProps) {
  const actions: RowAction[] = [
    { label: "Open", onClick: onOpen },
    { label: "Start Walk", onClick: onStartWalk },
    { label: "Plan Room", onClick: onPlanRoom },
    { label: "SlateDrop", onClick: onSlateDrop },
    ...(onRename ? [{ label: "Rename", onClick: onRename }] : []),
    ...(onArchive
      ? [{ label: "Archive", onClick: onArchive, separator: true }]
      : []),
    ...(onDelete
      ? [{ label: "Delete", onClick: onDelete, destructive: true }]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
        <MapPin className="size-4" />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-zinc-500">
          {walkCount} {walkCount === 1 ? "walk" : "walks"}
          {lastActivity && <span className="ml-2">&middot; {lastActivity}</span>}
        </p>
      </button>

      <SiteWalkV1RowMenu actions={actions} />
    </div>
  );
}
