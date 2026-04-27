"use client";

import { useEffect, useState } from "react";
import { getOfflineQueueSummary } from "@/lib/site-walk/offline-db";
import { startSiteWalkSyncManager, subscribeSiteWalkSync } from "@/lib/site-walk/sync-manager";

type SyncState = "offline" | "syncing" | "synced" | "failed";

type SyncSnapshot = {
  state: SyncState;
  pending: number;
  failed: number;
  total: number;
};

const INITIAL: SyncSnapshot = { state: "synced", pending: 0, failed: 0, total: 0 };

export function useSiteWalkSyncStatus() {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(INITIAL);

  useEffect(() => {
    startSiteWalkSyncManager();
    let mounted = true;
    void getOfflineQueueSummary().then((summary) => {
      if (!mounted) return;
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      setSnapshot({
        state: !online ? "offline" : summary.failed > 0 ? "failed" : summary.total > 0 ? "syncing" : "synced",
        ...summary,
      });
    });
    const unsubscribe = subscribeSiteWalkSync(setSnapshot);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return snapshot;
}
