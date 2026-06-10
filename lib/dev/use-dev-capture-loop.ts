"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveCaptureV2PreviewUrl } from "@/components/capture-v2/capture-v2-preview-url";
import type { CaptureV2Loop } from "@/components/capture-v2/useCaptureV2Loop";
import type { CaptureIntent } from "@/components/site-walk/capture/useCaptureFileHandler";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { DEV_MOCK_CAPTURE_ITEMS } from "./mock-site-walk";

type PreviewState = { url: string; title: string; itemId: string } | null;

type Options = {
  thumbCount?: number;
  liveMode?: boolean;
};

function sortItems(items: CaptureItemRecord[]) {
  return [...items].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

function buildDevThumbItem(index: number): CaptureItemRecord {
  const id = `dev-stop-synth-${index}`;
  const created = new Date(Date.now() - index * 60_000).toISOString();
  const label = `Stop ${index}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#1e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="16">${label}</text></svg>`;
  return {
    id,
    session_id: "dev-session-sandbox",
    client_item_id: id,
    client_mutation_id: `${id}-mutation`,
    item_type: "photo",
    title: label,
    description: null,
    location_label: null,
    category: "Observation",
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: "synced",
    upload_state: "uploaded",
    metadata: {},
    photo_attachment_pins: [],
    local_preview_url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    created_at: created,
    updated_at: created,
  };
}

function sliceSeedItems(thumbCount?: number) {
  const source = DEV_MOCK_CAPTURE_ITEMS.filter((item) => item.local_preview_url);
  if (thumbCount === undefined) return sortItems(DEV_MOCK_CAPTURE_ITEMS);
  if (thumbCount <= source.length) return sortItems(source.slice(0, thumbCount));
  const extras = Array.from({ length: thumbCount - source.length }, (_, offset) =>
    buildDevThumbItem(source.length + offset + 1),
  );
  return sortItems([...source, ...extras]);
}

export function useDevCaptureLoop(options: Options = {}) {
  const liveMode = options.liveMode ?? false;
  const seedItems = useMemo(() => sliceSeedItems(options.thumbCount), [options.thumbCount]);
  const [items, setItems] = useState<CaptureItemRecord[]>(() => seedItems);
  const [activeItemId, setActiveItemId] = useState<string | null>(() =>
    liveMode ? null : (seedItems[0]?.id ?? null),
  );
  const [activePreview, setActivePreview] = useState<PreviewState>(() => {
    if (liveMode) return null;
    const first = seedItems[0];
    if (!first) return null;
    const url = resolveCaptureV2PreviewUrl(first, null);
    if (!url) return null;
    return { url, title: first.title || "Captured photo", itemId: first.id };
  });

  useEffect(() => {
    setItems(seedItems);
    if (liveMode) {
      setActiveItemId(null);
      setActivePreview(null);
      return;
    }
    const first = seedItems[0];
    if (!first) {
      setActiveItemId(null);
      setActivePreview(null);
      return;
    }
    const url = resolveCaptureV2PreviewUrl(first, null);
    setActiveItemId(first.id);
    setActivePreview(
      url ? { url, title: first.title || "Captured photo", itemId: first.id } : null,
    );
  }, [liveMode, seedItems]);
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
