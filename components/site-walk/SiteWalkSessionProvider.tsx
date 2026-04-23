"use client";

/**
 * SiteWalkSessionProvider — capture-state safety net.
 *
 * Holds the user's in-progress capture so it survives:
 *   - Tab switching between Camera / Note / Voice (no draft loss)
 *   - Hard reloads mid-capture (text + photo Blob + audio Blob persisted
 *     to IndexedDB and rehydrated on remount via fresh ObjectURLs)
 *   - Network drops (failed POSTs are routed to lib/offline-queue.ts and
 *     auto-flushed on `online` events)
 *
 * Scope: a single active capture session. Mount this provider at the
 * `walks/active/[sessionId]` route segment via its `layout.tsx`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { get as idbGet, set as idbSet, del as idbDel, createStore } from "idb-keyval";
import { enqueue, flushQueue, pendingCount } from "@/lib/offline-queue";

export type DraftTab = "camera" | "note" | "voice" | null;

export interface DraftItem {
  tab: DraftTab;
  title: string;
  noteText: string;
  /** ObjectURL for an in-flight photo blob. Generated fresh on rehydrate. */
  photoBlobUrl: string | null;
  /** ObjectURL for an in-flight voice recording. Generated fresh on rehydrate. */
  audioBlobUrl: string | null;
  /** Underlying Blobs — what actually persists to IndexedDB. */
  photoBlob: Blob | null;
  audioBlob: Blob | null;
  updatedAt: number;
}

export interface CapturedItem {
  id: string;
  type: string;
  title: string;
  thumbnailUrl?: string;
  capturedAt: string;
}

export interface SiteWalkSessionState {
  sessionId: string;
  capturedItems: CapturedItem[];
  draftItem: DraftItem;
  isSyncing: boolean;
  pendingUploadCount: number;
  isOnline: boolean;
}

export interface SubmitItemPayload {
  url: string;
  body: Record<string, unknown>;
}

export interface SubmitItemResult {
  ok: boolean;
  queued: boolean;
  status?: number;
  error?: string;
}

export interface SiteWalkSessionApi {
  setCapturedItems: (items: CapturedItem[]) => void;
  addCapturedItem: (item: CapturedItem) => void;
  removeCapturedItem: (itemId: string) => void;
  updateDraft: (patch: Partial<DraftItem>) => void;
  clearDraft: () => void;
  beginSync: () => void;
  endSync: () => void;
  setPendingUploadCount: (n: number) => void;
  /**
   * Submit a capture. Tries network first; on network failure or offline,
   * enqueues the JSON payload into lib/offline-queue.ts. Blobs stay in the
   * draft IDB store until the upload eventually succeeds.
   */
  submitItem: (payload: SubmitItemPayload) => Promise<SubmitItemResult>;
  /** Flush the offline queue. Runs automatically on `online` events. */
  syncOfflineItems: () => Promise<number>;
}

const EMPTY_DRAFT: DraftItem = {
  tab: null,
  title: "",
  noteText: "",
  photoBlobUrl: null,
  audioBlobUrl: null,
  photoBlob: null,
  audioBlob: null,
  updatedAt: 0,
};

interface PersistedDraft {
  tab: DraftTab;
  title: string;
  noteText: string;
  photoBlob: Blob | null;
  audioBlob: Blob | null;
  updatedAt: number;
}

const SiteWalkSessionContext = createContext<
  (SiteWalkSessionState & SiteWalkSessionApi) | null
>(null);

// Dedicated IDB store for in-flight drafts. idb-keyval can store Blob values
// directly because IndexedDB uses the structured-clone algorithm.
const draftStore =
  typeof window !== "undefined"
    ? createStore("slate360-site-walk", "session-drafts")
    : null;

function draftKey(sessionId: string): string {
  return `draft:${sessionId}`;
}

async function loadDraftFromIdb(sessionId: string): Promise<DraftItem> {
  if (!draftStore) return EMPTY_DRAFT;
  try {
    const raw = await idbGet<PersistedDraft>(draftKey(sessionId), draftStore);
    if (!raw) return EMPTY_DRAFT;
    const photoBlob = raw.photoBlob instanceof Blob ? raw.photoBlob : null;
    const audioBlob = raw.audioBlob instanceof Blob ? raw.audioBlob : null;
    return {
      tab: raw.tab ?? null,
      title: typeof raw.title === "string" ? raw.title : "",
      noteText: typeof raw.noteText === "string" ? raw.noteText : "",
      photoBlob,
      audioBlob,
      photoBlobUrl: photoBlob ? URL.createObjectURL(photoBlob) : null,
      audioBlobUrl: audioBlob ? URL.createObjectURL(audioBlob) : null,
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

async function persistDraftToIdb(sessionId: string, draft: DraftItem): Promise<void> {
  if (!draftStore) return;
  try {
    const payload: PersistedDraft = {
      tab: draft.tab,
      title: draft.title,
      noteText: draft.noteText,
      photoBlob: draft.photoBlob,
      audioBlob: draft.audioBlob,
      updatedAt: draft.updatedAt,
    };
    await idbSet(draftKey(sessionId), payload, draftStore);
  } catch {
    // Quota / private mode — silent.
  }
}

async function clearDraftFromIdb(sessionId: string): Promise<void> {
  if (!draftStore) return;
  try {
    await idbDel(draftKey(sessionId), draftStore);
  } catch {
    // ignore
  }
}

export interface SiteWalkSessionProviderProps {
  sessionId: string;
  initialItems?: CapturedItem[];
  children: ReactNode;
}

export function SiteWalkSessionProvider({
  sessionId,
  initialItems = [],
  children,
}: SiteWalkSessionProviderProps) {
  const [capturedItems, setCapturedItemsState] = useState<CapturedItem[]>(initialItems);
  const [draftItem, setDraftItem] = useState<DraftItem>(EMPTY_DRAFT);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingUploadCount, setPendingUploadCountState] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Hydrate draft from IDB after mount (avoids SSR mismatch).
  const hydratedRef = useRef<boolean>(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void loadDraftFromIdb(sessionId).then((restored) => {
      if (
        restored.title ||
        restored.noteText ||
        restored.tab ||
        restored.photoBlob ||
        restored.audioBlob
      ) {
        setDraftItem(restored);
      }
    });
    void pendingCount().then((n) => setPendingUploadCountState(n));
  }, [sessionId]);

  // Persist draft on every change (after hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    void persistDraftToIdb(sessionId, draftItem);
  }, [sessionId, draftItem]);

  // Revoke object URLs on unmount to avoid leaks (Blobs themselves stay in IDB).
  useEffect(() => {
    return () => {
      if (draftItem.photoBlobUrl) URL.revokeObjectURL(draftItem.photoBlobUrl);
      if (draftItem.audioBlobUrl) URL.revokeObjectURL(draftItem.audioBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCapturedItems = useCallback((items: CapturedItem[]) => {
    setCapturedItemsState(items);
  }, []);

  const addCapturedItem = useCallback((item: CapturedItem) => {
    setCapturedItemsState((prev) => [item, ...prev]);
  }, []);

  const removeCapturedItem = useCallback((itemId: string) => {
    setCapturedItemsState((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateDraft = useCallback((patch: Partial<DraftItem>) => {
    setDraftItem((prev) => {
      if (
        patch.photoBlobUrl !== undefined &&
        prev.photoBlobUrl &&
        prev.photoBlobUrl !== patch.photoBlobUrl
      ) {
        URL.revokeObjectURL(prev.photoBlobUrl);
      }
      if (
        patch.audioBlobUrl !== undefined &&
        prev.audioBlobUrl &&
        prev.audioBlobUrl !== patch.audioBlobUrl
      ) {
        URL.revokeObjectURL(prev.audioBlobUrl);
      }
      return { ...prev, ...patch, updatedAt: Date.now() };
    });
  }, []);

  const clearDraft = useCallback(() => {
    setDraftItem((prev) => {
      if (prev.photoBlobUrl) URL.revokeObjectURL(prev.photoBlobUrl);
      if (prev.audioBlobUrl) URL.revokeObjectURL(prev.audioBlobUrl);
      return EMPTY_DRAFT;
    });
    void clearDraftFromIdb(sessionId);
  }, [sessionId]);

  const beginSync = useCallback(() => setIsSyncing(true), []);
  const endSync = useCallback(() => setIsSyncing(false), []);

  const setPendingUploadCount = useCallback((n: number) => {
    setPendingUploadCountState(n);
  }, []);

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

  const submitItem = useCallback(
    async (payload: SubmitItemPayload): Promise<SubmitItemResult> => {
      const { url, body } = payload;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;

      if (!offline) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            return { ok: true, queued: false, status: res.status };
          }
          if (res.status >= 400 && res.status < 500) {
            const errText = await res.text().catch(() => "");
            return { ok: false, queued: false, status: res.status, error: errText };
          }
          // 5xx — fall through to queue.
        } catch {
          // Network throw — fall through to queue.
        }
      }

      try {
        await enqueue({ url, method: "POST", body: JSON.stringify(body) });
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

  // Online / offline listeners — auto-flush when connection returns.
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

  const value = useMemo<SiteWalkSessionState & SiteWalkSessionApi>(
    () => ({
      sessionId,
      capturedItems,
      draftItem,
      isSyncing,
      pendingUploadCount,
      isOnline,
      setCapturedItems,
      addCapturedItem,
      removeCapturedItem,
      updateDraft,
      clearDraft,
      beginSync,
      endSync,
      setPendingUploadCount,
      submitItem,
      syncOfflineItems,
    }),
    [
      sessionId,
      capturedItems,
      draftItem,
      isSyncing,
      pendingUploadCount,
      isOnline,
      setCapturedItems,
      addCapturedItem,
      removeCapturedItem,
      updateDraft,
      clearDraft,
      beginSync,
      endSync,
      setPendingUploadCount,
      submitItem,
      syncOfflineItems,
    ],
  );

  return (
    <SiteWalkSessionContext.Provider value={value}>
      {children}
    </SiteWalkSessionContext.Provider>
  );
}

export function useSiteWalkSession(): SiteWalkSessionState & SiteWalkSessionApi {
  const ctx = useContext(SiteWalkSessionContext);
  if (!ctx) {
    throw new Error(
      "useSiteWalkSession must be used inside a <SiteWalkSessionProvider>. " +
        "Mount the provider in app/site-walk/walks/active/[sessionId]/layout.tsx.",
    );
  }
  return ctx;
}

/** Read-only hook for components that just need the badge count. */
export function useSiteWalkSessionItems(): CapturedItem[] {
  return useSiteWalkSession().capturedItems;
}
