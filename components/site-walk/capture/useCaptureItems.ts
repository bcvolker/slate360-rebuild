"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadOfflineItemsForSession, queueOfflineItemPatch } from "@/lib/site-walk/offline-capture";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import { withPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import type { UpdateItemPayload } from "@/lib/types/site-walk";
import { useCaptureItemFocus } from "./capture-item-events";
import { captureItemToDraft, type CaptureAssignee, type CaptureItemDraft, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

type ItemsResponse = { items?: CaptureItemRecord[]; error?: string };
type AssigneesResponse = { assignees?: CaptureAssignee[]; error?: string };
type FormatResponse = {
  formattedText?: string;
  cleanedNotes?: string;
  suggestedClassification?: string;
  suggestedPriority?: string;
  error?: string;
  metering?: { currentUsage: number; limit: number; tier: string };
};
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type HookArgs = { sessionId: string; projectId: string | null };

export function useCaptureItems({ sessionId, projectId }: HookArgs) {
  const [items, setItems] = useState<CaptureItemRecord[]>([]);
  const [assignees, setAssignees] = useState<CaptureAssignee[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CaptureItemDraft | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [aiState, setAiState] = useState<"idle" | "formatting" | "blocked" | "error">("idle");
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) ?? null,
    [activeItemId, items],
  );

  const selectItem = useCallback((item: CaptureItemRecord) => {
    dirtyRef.current = false;
    setActiveItemId(item.id);
    setDraft(captureItemToDraft(item));
    setSaveState("idle");
    setAiState("idle");
    setAiMessage(null);
  }, []);

  useCaptureItemFocus(useCallback((detail) => {
    setItems((current) => upsertItem(current, detail.item));
    if (detail.focus === false) {
      setActiveItemId((currentId) => {
        if (currentId !== detail.item.id && detail.item.client_item_id) {
          const active = items.find((item) => item.id === currentId);
          if (active?.client_item_id === detail.item.client_item_id) return detail.item.id;
        }
        return currentId;
      });
      return;
    }
    selectItem(detail.item);
  }, [items, selectItem]));

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/site-walk/items?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<ItemsResponse>)
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    void loadOfflineItemsForSession(sessionId).then((offlineItems) => {
      if (!cancelled && offlineItems.length > 0) setItems((current) => mergeItems(current, offlineItems));
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (!projectId) {
      setAssignees([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/site-walk/assignees`, { cache: "no-store" })
      .then((response) => response.json() as Promise<AssigneesResponse>)
      .then((data) => {
        if (!cancelled) setAssignees(data.assignees ?? []);
      })
      .catch(() => {
        if (!cancelled) setAssignees([]);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!draft || !activeItem || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("dirty");
    saveTimerRef.current = setTimeout(() => {
      void saveDraft(activeItem.id, draft);
    }, 1600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [activeItem, draft]);

  function patchDraft(patch: Partial<CaptureItemDraft>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
    if (typeof patch.title === "string" && patch.title.trim()) {
      sessionStorage.setItem(`site-walk:last-title:${sessionId}`, patch.title.trim());
    }
    dirtyRef.current = true;
  }

  async function saveDraft(itemId: string, nextDraft: CaptureItemDraft) {
    if (!activeItem) return;
    setSaveState("saving");
    const payload: UpdateItemPayload = {
      title: nextDraft.title,
      description: nextDraft.notes,
      category: nextDraft.classification,
      priority: nextDraft.priority,
      item_status: nextDraft.status,
      assigned_to: nextDraft.assignedTo || null,
      due_date: nextDraft.dueDate || null,
      sync_state: "synced",
    };
    try {
      if (isOffline() || itemId.startsWith("item-")) {
        await queueOfflineItemPatch(sessionId, activeItem, payload);
        const local = patchLocalItem(activeItem, nextDraft);
        dirtyRef.current = false;
        setItems((current) => upsertItem(current, local));
        setSaveState("saved");
        return;
      }
      const response = await fetch(`/api/site-walk/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as { item?: CaptureItemRecord; error?: string } | null;
      if (!response.ok || !data?.item) throw new Error(data?.error ?? "Autosave failed");
      dirtyRef.current = false;
      setItems((current) => upsertItem(current, data.item as CaptureItemRecord));
      setSaveState("saved");
    } catch {
      await queueOfflineItemPatch(sessionId, activeItem, payload);
      const local = patchLocalItem(activeItem, nextDraft);
      dirtyRef.current = false;
      setItems((current) => upsertItem(current, local));
      setSaveState("saved");
    }
  }

  async function formatNotesWithAi() {
    if (!activeItem || !draft?.notes.trim()) return;
    setAiState("formatting");
    setAiMessage(null);
    const response = await fetch("/api/site-walk/notes/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: draft.notes, item_id: activeItem.id, session_id: sessionId, project_id: projectId }),
    });
    const data = (await response.json().catch(() => null)) as FormatResponse | null;
    if (response.status === 402) {
      setAiState("blocked");
      const limit = data?.metering?.limit;
      setAiMessage(limit ? `AI credits exhausted for this month (${limit} credit cap).` : data?.error ?? "AI credits exhausted.");
      return;
    }
    const cleanedNotes = data?.cleanedNotes ?? data?.formattedText;
    if (!response.ok || !cleanedNotes) {
      setAiState("error");
      setAiMessage(data?.error ?? "AI formatting failed.");
      return;
    }
    patchDraft({
      notes: cleanedNotes,
      classification: normalizeClassification(data?.suggestedClassification),
      priority: normalizePriority(data?.suggestedPriority),
    });
    setAiState("idle");
    setAiMessage("AI cleaned the notes and suggested tags. Autosave will run next.");
  }

  async function saveMarkupData(itemId: string, markup: MarkupData) {
    const item = items.find((current) => current.id === itemId || current.client_item_id === itemId);
    if (!item) return;
    const revision = Date.now();
    const payload: UpdateItemPayload = { markup_data: markup, markup_revision: revision, sync_state: "synced" };
    setItems((current) => upsertItem(current, { ...item, markup_data: markup, sync_state: "pending", updated_at: new Date().toISOString() }));
    try {
      if (isOffline() || item.id.startsWith("item-")) {
        await queueOfflineItemPatch(sessionId, item, payload);
        return;
      }
      const response = await fetch(`/api/site-walk/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Markup save failed");
    } catch {
      await queueOfflineItemPatch(sessionId, item, payload);
    }
  }

  async function savePhotoAttachmentPins(itemId: string, pins: PhotoAttachmentPin[]) {
    const item = items.find((current) => current.id === itemId || current.client_item_id === itemId);
    if (!item) return;
    const metadata = withPhotoAttachmentPins(item.metadata, pins);
    const payload: UpdateItemPayload = { metadata, sync_state: "synced" };
    const local = { ...item, metadata, photo_attachment_pins: pins, sync_state: "pending" as const, updated_at: new Date().toISOString() };
    setItems((current) => upsertItem(current, local));
    try {
      if (isOffline() || item.id.startsWith("item-")) {
        await queueOfflineItemPatch(sessionId, item, payload);
        return;
      }
      const response = await fetch(`/api/site-walk/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Attachment pin save failed");
    } catch {
      await queueOfflineItemPatch(sessionId, item, payload);
    }
  }

  return {
    items,
    assignees,
    activeItem,
    draft,
    saveState,
    aiState,
    aiMessage,
    selectItem,
    patchDraft,
    saveMarkupData,
    savePhotoAttachmentPins,
    formatNotesWithAi,
  };
}

function normalizeClassification(value: string | undefined): CaptureItemDraft["classification"] {
  const match = ["Issue", "Observation", "Safety", "Progress", "On Track", "Behind Schedule", "Incorrect Work", "Question", "Other"].find((option) => option.toLowerCase() === value?.toLowerCase());
  return (match ?? "Observation") as CaptureItemDraft["classification"];
}

function normalizePriority(value: string | undefined): CaptureItemDraft["priority"] {
  const normalized = value?.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") return normalized;
  return "medium";
}

function mergeItems(current: CaptureItemRecord[], incoming: CaptureItemRecord[]) {
  return incoming.reduce((items, item) => upsertItem(items, item), current);
}

function patchLocalItem(item: CaptureItemRecord, draft: CaptureItemDraft): CaptureItemRecord {
  return {
    ...item,
    title: draft.title,
    description: draft.notes,
    category: draft.classification,
    priority: draft.priority,
    item_status: draft.status,
    assigned_to: draft.assignedTo || null,
    due_date: draft.dueDate || null,
    sync_state: "pending",
    updated_at: new Date().toISOString(),
  };
}

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function upsertItem(items: CaptureItemRecord[], item: CaptureItemRecord) {
  const match = (current: CaptureItemRecord) => current.id === item.id || (!!current.client_item_id && current.client_item_id === item.client_item_id);
  const exists = items.some(match);
  const next = exists ? items.map((current) => match(current) ? { ...current, ...item, local_preview_url: item.local_preview_url ?? current.local_preview_url } : current) : [item, ...items];
  return next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
