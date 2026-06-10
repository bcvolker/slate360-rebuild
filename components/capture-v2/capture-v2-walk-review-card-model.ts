import { getItemPhotoAngles } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2SummaryItem } from "./capture-v2-summary-types";

export type WalkReviewStopCardModel = {
  id: string;
  stopNumber: number;
  thumbUrl: string | null;
  noteSnippet: string;
  statusLabel: string;
  statusTone: "critical" | "resolved" | "open";
  voiceMemoCount: number;
  voiceMemoDurationMs: number;
  extraAngleCount: number;
  href: string;
};

export function isWalkReviewStopItem(item: CaptureItemRecord): boolean {
  if (item.item_type === "voice_note" && item.before_item_id) return false;
  return true;
}

export function buildWalkReviewStopCards(
  items: CaptureItemRecord[],
  sessionId: string,
  itemHref: (itemId: string) => string,
): WalkReviewStopCardModel[] {
  const ordered = [...items]
    .filter(isWalkReviewStopItem)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  return ordered.map((item, index) => {
    const voiceMemos = items.filter(
      (row) => row.before_item_id === item.id && row.item_type === "voice_note",
    );
    const extraAngleCount = Math.max(0, getItemPhotoAngles(item).length);
    const voiceMemoDurationMs = voiceMemos.reduce(
      (total, memo) => total + readVoiceMemoDurationMs(memo),
      0,
    );

    return {
      id: item.id,
      stopNumber: index + 1,
      thumbUrl:
        item.item_type === "photo"
          ? `/api/site-walk/items/${encodeURIComponent(item.id)}/image`
          : item.local_preview_url ?? null,
      noteSnippet: item.description?.trim() || item.title?.trim() || "No notes added yet.",
      statusLabel: resolveStatusLabel(item),
      statusTone: resolveStatusTone(item),
      voiceMemoCount: voiceMemos.length,
      voiceMemoDurationMs,
      extraAngleCount,
      href: itemHref(item.id),
    };
  });
}

export function mapSummaryItemsToCaptureRecords(items: CaptureV2SummaryItem[]): CaptureItemRecord[] {
  return items.map((item) => ({
    id: item.id,
    session_id: "",
    client_item_id: item.id,
    client_mutation_id: item.id,
    item_type: item.itemType,
    title: item.title,
    description: item.description,
    location_label: item.locationLabel,
    category: item.classification,
    priority: item.priority,
    item_status: item.itemStatus,
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: item.syncState,
    upload_state: item.uploadState,
    metadata: item.metadata ?? {},
    photo_attachment_pins: [],
    local_preview_url: null,
    before_item_id: item.beforeItemId,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }));
}

function resolveStatusTone(item: CaptureItemRecord | CaptureV2SummaryItem): WalkReviewStopCardModel["statusTone"] {
  if (item.priority === "critical") return "critical";
  const status = "item_status" in item ? item.item_status : item.itemStatus;
  if (status === "resolved" || status === "verified") return "resolved";
  return "open";
}

function resolveStatusLabel(item: CaptureItemRecord | CaptureV2SummaryItem): string {
  if (item.priority === "critical") return "critical";
  const status = "item_status" in item ? item.item_status : item.itemStatus;
  return status.replace(/_/g, " ");
}

function readVoiceMemoDurationMs(item: CaptureItemRecord): number {
  const meta = item.metadata;
  if (meta && typeof meta === "object") {
    const duration = (meta as Record<string, unknown>).duration_ms;
    if (typeof duration === "number") return duration;
  }
  return 0;
}

export function formatVoiceMemoDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
