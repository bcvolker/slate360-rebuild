"use client";

/**
 * SiteWalkSessionProvider — capture-state safety net + realtime sync.
 *
 * Survives tab switches, hard reloads (IDB blob persistence), network
 * drops (offline queue), and multi-user sessions (Supabase Realtime
 * broadcasts on site_walk_items + site_walk_pins).
 *
 * Mount at app/site-walk/walks/active/[sessionId]/layout.tsx.
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
import {
  EMPTY_DRAFT,
  loadDraftFromIdb,
  persistDraftToIdb,
  clearDraftFromIdb,
  type DraftItem,
  type DraftTab,
} from "@/lib/site-walk/draft-store";
import { useSiteWalkRealtime, type SiteWalkRealtimeApi } from "@/lib/hooks/useSiteWalkRealtime";
import {
  useSiteWalkOfflineSync,
  type SubmitItemPayload,
  type SubmitItemResult,
  type SubmitMutationPayload,
} from "@/lib/hooks/useSiteWalkOfflineSync";

export type {
  DraftItem,
  DraftTab,
  SubmitItemPayload,
  SubmitItemResult,
  SubmitMutationPayload,
};

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

export interface SiteWalkSessionApi {
  setCapturedItems: (items: CapturedItem[]) => void;
  addCapturedItem: (item: CapturedItem) => void;
  removeCapturedItem: (itemId: string) => void;
  updateDraft: (patch: Partial<DraftItem>) => void;
  clearDraft: () => void;
  beginSync: () => void;
  endSync: () => void;
  setPendingUploadCount: (n: number) => void;
  submitItem: (payload: SubmitItemPayload) => Promise<SubmitItemResult>;
  submitMutation: (payload: SubmitMutationPayload) => Promise<SubmitItemResult>;
  syncOfflineItems: () => Promise<number>;
  realtime: SiteWalkRealtimeApi;
}

const SiteWalkSessionContext = createContext<
  (SiteWalkSessionState & SiteWalkSessionApi) | null
>(null);

interface RealtimeItemRow {
  id?: string;
  item_type?: string;
  title?: string;
  captured_at?: string;
  [key: string]: unknown;
}

function realtimeRowToCapturedItem(row: RealtimeItemRow): CapturedItem | null {
  if (!row.id) return null;
  return {
    id: row.id,
    type: typeof row.item_type === "string" ? row.item_type : "unknown",
    title: typeof row.title === "string" ? row.title : "",
    capturedAt:
      typeof row.captured_at === "string" ? row.captured_at : new Date().toISOString(),
  };
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

  const {
    isOnline,
    isSyncing,
    pendingUploadCount,
    beginSync,
    endSync,
    setPendingUploadCount,
    submitItem,
    submitMutation,
    syncOfflineItems,
  } = useSiteWalkOfflineSync();

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
  }, [sessionId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void persistDraftToIdb(sessionId, draftItem);
  }, [sessionId, draftItem]);

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
    setCapturedItemsState((prev) =>
      prev.some((i) => i.id === item.id) ? prev : [item, ...prev],
    );
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

  // Realtime: optimistically reconcile capturedItems with INSERT/UPDATE/
  // DELETE events from any other connected user. Also exposes ephemeral
  // broadcast channel (cursor + pin drag) on the returned API.
  const realtime = useSiteWalkRealtime<RealtimeItemRow>(sessionId, {
    onItemInsert: (row) => {
      const item = realtimeRowToCapturedItem(row);
      if (item) addCapturedItem(item);
    },
    onItemUpdate: (row) => {
      const item = realtimeRowToCapturedItem(row);
      if (!item) return;
      setCapturedItemsState((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...item } : i)),
      );
    },
    onItemDelete: (row) => {
      if (typeof row.id === "string") removeCapturedItem(row.id);
    },
  });

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
      submitMutation,
      syncOfflineItems,
      realtime,
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
      submitMutation,
      syncOfflineItems,
      realtime,
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

export function useSiteWalkSessionItems(): CapturedItem[] {
  return useSiteWalkSession().capturedItems;
}
