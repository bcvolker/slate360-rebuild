"use client";

import { useEffect, useState, useCallback } from "react";
import { flushQueue, pendingCount } from "@/lib/offline-queue";

/** Tracks online/offline status and auto-flushes the offline queue on reconnect */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const count = await pendingCount();
    setPending(count);
  }, []);

  const flush = useCallback(async () => {
    setSyncing(true);
    try {
      await flushQueue();
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      flush();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    refreshPending();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush, refreshPending]);

  return { isOnline, pending, syncing, flush, refreshPending };
}
