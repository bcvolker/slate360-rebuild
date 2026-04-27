"use client";

import { Cloud, RefreshCcw, WifiOff } from "lucide-react";
import { useSiteWalkSyncStatus } from "@/lib/hooks/useSiteWalkSyncStatus";

export function SyncQueueIndicator() {
  const { state, total, failed } = useSiteWalkSyncStatus();
  const offline = state === "offline";
  const syncing = state === "syncing" && total > 0;
  const failedState = state === "failed";
  const label = offline
    ? "Working Offline"
    : failedState
      ? `${failed} sync issue${failed === 1 ? "" : "s"}`
      : syncing
        ? `Syncing ${total} item${total === 1 ? "" : "s"}...`
        : "All Synced";
  const classes = offline
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : failedState
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : syncing
        ? "border-blue-200 bg-blue-50 text-blue-900"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold ${classes}`} aria-label="Sync queue status">
      {offline ? <WifiOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
      <span>{label}</span>
      {syncing && <RefreshCcw className="h-4 w-4 animate-spin" />}
      {!offline && total > 0 && <span>{total} pending</span>}
    </div>
  );
}
