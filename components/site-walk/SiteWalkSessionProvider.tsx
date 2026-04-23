"use client";

/**
 * SiteWalkSessionProvider — capture-state safety net.
 *
 * Holds the user's in-progress capture so it survives:
 *   - Tab switching between Camera / Note / Voice (no draft loss)
 *   - Brief network drops (items + drafts mirrored to sessionStorage so
 *     a hard reload during capture restores the form)
 *
 * Scope: a single active capture session. Mount this provider at the
 * `walks/active/[sessionId]` route segment via its `layout.tsx`.
 *
 * NOT a global app provider — wrapping the whole app would risk leaking
 * one session's draft into the next.
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

export type DraftTab = "camera" | "note" | "voice" | null;

export interface DraftItem {
  /** Which capture tab this draft belongs to. */
  tab: DraftTab;
  /** Free-form title — applies to all tabs. */
  title: string;
  /** Note body (used by `note` and as caption for photo/voice). */
  noteText: string;
  /** ObjectURL for an in-flight photo blob. Cleared on commit. */
  photoBlobUrl: string | null;
  /** ObjectURL for an in-flight voice recording. Cleared on commit. */
  audioBlobUrl: string | null;
  /** Last-edited timestamp (epoch ms) — for stale-draft warnings. */
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
}

export interface SiteWalkSessionApi {
  setCapturedItems: (items: CapturedItem[]) => void;
  addCapturedItem: (item: CapturedItem) => void;
  updateDraft: (patch: Partial<DraftItem>) => void;
  clearDraft: () => void;
  beginSync: () => void;
  endSync: () => void;
  setPendingUploadCount: (n: number) => void;
}

const EMPTY_DRAFT: DraftItem = {
  tab: null,
  title: "",
  noteText: "",
  photoBlobUrl: null,
  audioBlobUrl: null,
  updatedAt: 0,
};

const SiteWalkSessionContext = createContext<
  (SiteWalkSessionState & SiteWalkSessionApi) | null
>(null);

function draftStorageKey(sessionId: string): string {
  return `slate360.siteWalk.draft.${sessionId}`;
}

function loadDraftFromStorage(sessionId: string): DraftItem {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = window.sessionStorage.getItem(draftStorageKey(sessionId));
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<DraftItem>;
    return {
      tab: parsed.tab ?? null,
      title: typeof parsed.title === "string" ? parsed.title : "",
      noteText: typeof parsed.noteText === "string" ? parsed.noteText : "",
      // Blob URLs do NOT survive reloads — the underlying Blob is gone.
      // Persist text only; treat media drafts as ephemeral.
      photoBlobUrl: null,
      audioBlobUrl: null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function persistDraftToStorage(sessionId: string, draft: DraftItem): void {
  if (typeof window === "undefined") return;
  try {
    // Only persist serialisable text fields.
    const payload: Pick<DraftItem, "tab" | "title" | "noteText" | "updatedAt"> = {
      tab: draft.tab,
      title: draft.title,
      noteText: draft.noteText,
      updatedAt: draft.updatedAt,
    };
    window.sessionStorage.setItem(draftStorageKey(sessionId), JSON.stringify(payload));
  } catch {
    // Quota / private mode — silent.
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
  const [pendingUploadCount, setPendingUploadCount] = useState<number>(0);

  // Hydrate draft from sessionStorage after mount (avoids SSR mismatch).
  const hydratedRef = useRef<boolean>(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const restored = loadDraftFromStorage(sessionId);
    if (restored.title || restored.noteText || restored.tab) {
      setDraftItem(restored);
    }
  }, [sessionId]);

  // Persist draft on every change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    persistDraftToStorage(sessionId, draftItem);
  }, [sessionId, draftItem]);

  // Revoke object URLs on unmount to avoid leaks.
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

  const updateDraft = useCallback((patch: Partial<DraftItem>) => {
    setDraftItem((prev) => {
      // Revoke superseded blob URLs.
      if (patch.photoBlobUrl !== undefined && prev.photoBlobUrl && prev.photoBlobUrl !== patch.photoBlobUrl) {
        URL.revokeObjectURL(prev.photoBlobUrl);
      }
      if (patch.audioBlobUrl !== undefined && prev.audioBlobUrl && prev.audioBlobUrl !== patch.audioBlobUrl) {
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
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(draftStorageKey(sessionId));
      } catch {
        // ignore
      }
    }
  }, [sessionId]);

  const beginSync = useCallback(() => setIsSyncing(true), []);
  const endSync = useCallback(() => setIsSyncing(false), []);

  const value = useMemo<SiteWalkSessionState & SiteWalkSessionApi>(
    () => ({
      sessionId,
      capturedItems,
      draftItem,
      isSyncing,
      pendingUploadCount,
      setCapturedItems,
      addCapturedItem,
      updateDraft,
      clearDraft,
      beginSync,
      endSync,
      setPendingUploadCount,
    }),
    [
      sessionId,
      capturedItems,
      draftItem,
      isSyncing,
      pendingUploadCount,
      setCapturedItems,
      addCapturedItem,
      updateDraft,
      clearDraft,
      beginSync,
      endSync,
    ],
  );

  return (
    <SiteWalkSessionContext.Provider value={value}>{children}</SiteWalkSessionContext.Provider>
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

/** Read-only hook for components that just need the badge count without
 *  triggering re-renders on every draft keystroke. */
export function useSiteWalkSessionItems(): CapturedItem[] {
  return useSiteWalkSession().capturedItems;
}
