"use client";

import { useOfflineSync } from "@/lib/hooks/useOfflineSync";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pending, syncing, flush } = useOfflineSync();

  if (isOnline && pending === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 shadow-lg dark:border-app dark:bg-app-card">
      {!isOnline && (
        <>
          <WifiOff className="size-4 text-amber-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Offline
            {pending > 0 && (
              <span className="text-xs text-zinc-500"> &middot; {pending} pending</span>
            )}
          </span>
        </>
      )}
      {isOnline && pending > 0 && (
        <>
          {syncing ? (
            <Loader2 className="size-4 animate-spin text-blue-500" />
          ) : (
            <RefreshCw className="size-4 text-blue-500" />
          )}
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {syncing ? "Syncing..." : `${pending} changes to sync`}
          </span>
          {!syncing && (
            <button
              onClick={flush}
              className="ml-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Sync now
            </button>
          )}
        </>
      )}
    </div>
  );
}
