"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import type { SiteWalkSyncState } from "@/lib/types/site-walk";

type Props = {
  isOnline: boolean;
  syncState: SiteWalkSyncState;
};

export function SyncStatusBadge({ isOnline, syncState }: Props) {
  const syncing = syncState === "syncing";
  const label = isOnline ? labelFor(syncState) : "Offline · Pending";
  const color = !isOnline || syncState === "failed" || syncState === "conflict"
    ? "bg-amber-50 text-amber-900 ring-amber-200"
    : syncing || syncState === "pending"
      ? "bg-blue-50 text-blue-900 ring-blue-200"
      : "bg-emerald-50 text-emerald-800 ring-emerald-200";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${color}`}>
      {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isOnline ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function labelFor(syncState: SiteWalkSyncState) {
  if (syncState === "pending") return "Online · Pending";
  if (syncState === "syncing") return "Online · Syncing";
  if (syncState === "failed") return "Online · Sync failed";
  if (syncState === "conflict") return "Online · Conflict";
  return "Online · Synced";
}
