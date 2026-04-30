import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

export function getCaptureImageUrl(item: Pick<CaptureItemRecord, "id" | "item_type" | "local_preview_url"> | null | undefined) {
  if (!item || item.item_type !== "photo") return null;
  if (item.local_preview_url) return item.local_preview_url;
  return item.id.startsWith("item-") ? null : `/api/site-walk/items/${encodeURIComponent(item.id)}/image`;
}
