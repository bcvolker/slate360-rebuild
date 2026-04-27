"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UpdateItemPayload } from "@/lib/types/site-walk";
import { useCaptureItemFocus } from "./capture-item-events";
import { captureItemToDraft, type CaptureAssignee, type CaptureItemDraft, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

type ItemsResponse = { items?: CaptureItemRecord[]; error?: string };
type AssigneesResponse = { assignees?: CaptureAssignee[]; error?: string };
type FormatResponse = { formattedText?: string; error?: string; metering?: { currentUsage: number; limit: number; tier: string } };
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
    selectItem(detail.item);
  }, [selectItem]));

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
    dirtyRef.current = true;
  }

  async function saveDraft(itemId: string, nextDraft: CaptureItemDraft) {
    setSaveState("saving");
    const payload: UpdateItemPayload = {
      title: nextDraft.title,
      description: nextDraft.notes,
      category: nextDraft.classification,
      priority: nextDraft.priority,
      item_status: nextDraft.status,
      assigned_to: nextDraft.assignedTo || null,
      sync_state: "synced",
    };
    try {
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
      setSaveState("error");
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
    if (!response.ok || !data?.formattedText) {
      setAiState("error");
      setAiMessage(data?.error ?? "AI formatting failed.");
      return;
    }
    patchDraft({ notes: data.formattedText });
    setAiState("idle");
    setAiMessage("Formatted with AI. Autosave will run next.");
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
    formatNotesWithAi,
  };
}

function upsertItem(items: CaptureItemRecord[], item: CaptureItemRecord) {
  const exists = items.some((current) => current.id === item.id);
  const next = exists ? items.map((current) => current.id === item.id ? item : current) : [item, ...items];
  return next.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
