"use client";

import { FileText } from "lucide-react";
import { SiteWalkV1RowMenu, type RowAction } from "./SiteWalkV1RowMenu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ReportV1RowProps = {
  title: string;
  sourceWalk: string | null;
  reportType: string;
  lastUpdated: string;
  onOpen: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  className?: string;
};

function typeLabel(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReportV1Row({
  title,
  sourceWalk,
  reportType,
  lastUpdated,
  onOpen,
  onShare,
  onDelete,
  className,
}: ReportV1RowProps) {
  const actions: RowAction[] = [
    { label: "Open", onClick: onOpen },
    ...(onShare ? [{ label: "Share", onClick: onShare }] : []),
    ...(onDelete
      ? [{ label: "Delete", onClick: onDelete, destructive: true, separator: true }]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
        <FileText className="size-4" />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {sourceWalk ?? "Standalone"}
          <span className="mx-1.5">&middot;</span>
          {lastUpdated}
        </p>
      </button>

      <Badge
        variant="outline"
        className="rounded-md border-zinc-700 bg-zinc-800/50 px-1.5 py-0 text-[10px] text-zinc-400"
      >
        {typeLabel(reportType)}
      </Badge>

      <SiteWalkV1RowMenu actions={actions} />
    </div>
  );
}
