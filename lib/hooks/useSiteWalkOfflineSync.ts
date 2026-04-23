/**
 * lib/hooks/useSiteWalkOfflineSync.ts
 *
 * Extracts the offline-queue plumbing from SiteWalkSessionProvider:
 *   - submitItem(payload): tries network first, falls back to enqueue
 *   - syncOfflineItems(): flushes the queue
 *   - online/offline event listeners (auto-flush on reconnect)
 *   - tracks isOnline + pendingUploadCount
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { enqueue, flushQueue, pendingCount } from "@/lib/offline-queue";

export interface SubmitItemPayload {
  url: string;
  body: Record<string, unknown>;
}

export type OfflineMutationMethod = "POST" | "PATCH" | "DELETE";

export interface SubmitMutationPayload {
  url: string;
  method: OfflineMutationMethod;
  body?: Record<string, unknown>;
}

export interface SubmitItemResult {
  ok: boolean;
  queued: boolean;
  status?: number;
  error?: string;
}

export interface SiteWalkOfflineSyncApi {
  isOnline: boolean;
  isSyncing: boolean;
  pendingUploadCount: number;
  beginSync: () => void;
  endSync: () => void;
  setPendingUploadCount: (n: number) => void;
  submitItem: (payload: SubmitItemPayload) => Promise<SubmitItemResult>;
  /**
   * Generic mutation submitter — used for any non-create call that should
   * fall back to the offline queue (e.g. PATCH /api/site-walk/pins/[id]).
   * Network-first, queue on 5xx / network throw / `!navigator.onLine`.
   */
  submitMutation: (payload: SubmitMutationPayload) => Promise<SubmitItemResult>;
  syncOfflineItems: () => Promise<number>;
}

export function useSiteWalkOfflineSync(): SiteWalkOfflineSyncApi {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingUploadCount, setPendingUploadCountState] = useState<number>(0);

  useEffect(() => {
    void pendingCount().then((n) => setPendingUploadCountState(n));
  }, []);

  const beginSync = useCallback(() => setIsSyncing(true), []);
  const endSync = useCallback(() => setIsSyncing(false), []);
  const setPendingUploadCount = useCallback(
    (n: number) => setPendingUploadCountState(n),
    [],
  );

  const syncOfflineItems = useCallback(async (): Promise<number> => {
    setIsSyncing(true);
    try {
      const flushed = await flushQueue();
      const remaining = await pendingCount();
      setPendingUploadCountState(remaining);
      return flushed;
    } catch {
      return 0;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const submitMutation = useCallback(
    async (payload: SubmitMutationPayload): Promise<SubmitItemResult> => {
      const { url, method, body } = payload;
      const serialised = body ? JSON.stringify(body) : "";
      const offline = typeof navigator !== "undefined" && !navigator.onLine;

      if (!offline) {
        try {
          const res = await fetch(url, {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: method === "DELETE" ? undefined : serialised || undefined,
          });
          if (res.ok) return { ok: true, queued: false, status: res.status };
          if (res.status >= 400 && res.status < 500) {
            const errText = await res.text().catch(() => "");
            return { ok: false, queued: false, status: res.status, error: errText };
          }
          // 5xx → fall through to queue.
        } catch {
          // Network throw → fall through to queue.
        }
      }

      try {
        await enqueue({ url, method, body: serialised });
        const remaining = await pendingCount();
        setPendingUploadCountState(remaining);
        return { ok: true, queued: true };
      } catch (err) {
        return {
          ok: false,
          queued: false,
          error: err instanceof Error ? err.message : "queue failure",
        };
      }
    },
    [],
  );

  const submitItem = useCallback(
    (payload: SubmitItemPayload): Promise<SubmitItemResult> =>
      submitMutation({ url: payload.url, method: "POST", body: payload.body }),
    [submitMutation],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      setIsOnline(true);
      void syncOfflineItems();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncOfflineItems]);

  return {
    isOnline,
    isSyncing,
    pendingUploadCount,
    beginSync,
    endSync,
    setPendingUploadCount,
    submitItem,
    submitMutation,
    syncOfflineItems,
  };
}
