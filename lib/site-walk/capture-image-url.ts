import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

const FILE_IMAGE_ITEM_TYPES = new Set(["photo", "photo_360"]);

export function getCaptureImageUrl(item: Pick<CaptureItemRecord, "id" | "item_type" | "local_preview_url"> | null | undefined) {
  if (!item || !FILE_IMAGE_ITEM_TYPES.has(item.item_type)) return null;
  if (item.local_preview_url) return item.local_preview_url;
  return item.id.startsWith("item-") ? null : `/api/site-walk/items/${encodeURIComponent(item.id)}/image`;
}
