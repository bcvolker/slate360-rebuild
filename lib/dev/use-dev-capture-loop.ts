"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { resolveCaptureV2PreviewUrl } from "@/components/capture-v2/capture-v2-preview-url";
import type { CaptureV2Loop } from "@/components/capture-v2/useCaptureV2Loop";
import type { CaptureIntent } from "@/components/site-walk/capture/useCaptureFileHandler";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { DEV_MOCK_CAPTURE_ITEMS } from "./mock-site-walk";

type PreviewState = { url: string; title: string; itemId: string } | null;

function sortItems(items: CaptureItemRecord[]) {
  return [...items].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

export function useDevCaptureLoop(seedItems: CaptureItemRecord[] = DEV_MOCK_CAPTURE_ITEMS) {
  const [items, setItems] = useState<CaptureItemRecord[]>(() => sortItems(seedItems));
  const [activeItemId, setActiveItemId] = useState<string | null>(seedItems[0]?.id ?? null);
  const [activePreview, setActivePreview] = useState<PreviewState>(() => {
    const first = seedItems[0];
    if (!first) return null;
    const url = resolveCaptureV2PreviewUrl(first, null);
    if (!url) return null;
    return { url, title: first.title || "Captured photo", itemId: first.id };
  });
  const [deletingStopId, setDeletingStopId] = useState<string | null>(null);
  const intentRef = useRef<CaptureIntent>({ source: "quick_capture", input: "camera" });

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) ?? null,
    [activeItemId, items],
  );

  const focusFilmstripItem = useCallback((item: CaptureItemRecord) => {
    setActiveItemId(item.id);
    const imageUrl = resolveCaptureV2PreviewUrl(item, null);
    if (imageUrl) {
      setActivePreview({
        url: imageUrl,
        title: item.title?.trim() || "Captured photo",
        itemId: item.id,
      });
      return;
    }
    setActivePreview(null);
  }, []);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const id = `dev-stop-${Date.now()}`;
    const now = new Date().toISOString();
    const nextItem: CaptureItemRecord = {
      id,
      session_id: items[0]?.session_id ?? "dev-session-sandbox",
      client_item_id: id,
      client_mutation_id: `${id}-mutation`,
      item_type: "photo",
      title: "New capture",
      description: null,
      location_label: null,
      category: "Observation",
      priority: "medium",
      item_status: "open",
      assigned_to: null,
      due_date: null,
      capture_mode: "camera",
      sync_state: "pending",
      upload_state: "queued",
      metadata: {},
      photo_attachment_pins: [],
      local_preview_url: previewUrl,
      created_at: now,
      updated_at: now,
    };
    setItems((current) => sortItems([...current, nextItem]));
    setActiveItemId(id);
    setActivePreview({ url: previewUrl, title: "New capture", itemId: id });
  }, [items]);

  const deleteStop = useCallback(async (item: CaptureItemRecord) => {
    setDeletingStopId(item.id);
    setItems((current) => current.filter((row) => row.id !== item.id));
    if (activeItemId === item.id) {
      setActiveItemId(null);
      setActivePreview(null);
    }
    setDeletingStopId(null);
    return { ok: true as const };
  }, [activeItemId]);

  const loop = {
    items,
    activeItem,
    activePreview,
    setActivePreview,
    busy: false,
    deletingStopId,
    setIntent: (intent: CaptureIntent) => {
      intentRef.current = intent;
    },
    handleFile,
    focusFilmstripItem,
    deleteStop,
  } as unknown as CaptureV2Loop;

  return loop;
}
