"use client";

import { SiteWalkV1RowMenu, type RowAction } from "./SiteWalkV1RowMenu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WalkV1RowProps = {
  title: string;
  worksiteName: string | null;
  status: string;
  itemCount: number;
  lastUpdated: string;
  onOpen: () => void;
  onRename?: () => void;
  onLinkWorksite?: () => void;
  onCreateReport?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
};

const statusColors: Record<string, string> = {
  draft: "border-zinc-600 bg-zinc-800 text-zinc-400",
  in_progress: "border-amber-600/40 bg-amber-900/30 text-amber-400",
  completed: "border-teal-600/40 bg-teal-900/30 text-teal-400",
  archived: "border-zinc-700 bg-zinc-800/50 text-zinc-500",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WalkV1Row({
  title,
  worksiteName,
  status,
  itemCount,
  lastUpdated,
  onOpen,
  onRename,
  onLinkWorksite,
  onCreateReport,
  onArchive,
  onDelete,
  className,
}: WalkV1RowProps) {
  const actions: RowAction[] = [
    { label: "Open", onClick: onOpen },
    ...(onRename ? [{ label: "Rename", onClick: onRename }] : []),
    ...(onLinkWorksite
      ? [{ label: "Link Worksite", onClick: onLinkWorksite }]
      : []),
    ...(onCreateReport
      ? [{ label: "Create Deliverable", onClick: onCreateReport }]
      : []),
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
        "flex min-h-[72px] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3.5 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md px-1.5 py-0 text-[10px]",
              statusColors[status] ?? statusColors.draft,
            )}
          >
            {statusLabel(status)}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {worksiteName ?? "No worksite"}
          <span className="mx-1.5">&middot;</span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
          <span className="mx-1.5">&middot;</span>
          {lastUpdated}
        </p>
      </button>

      <SiteWalkV1RowMenu actions={actions} />
    </div>
  );
}
