import {
  deriveCaptureV2StoredItemSyncKind,
  itemNeedsCaptureDetails,
} from "./capture-v2-item-sync";
import type { CaptureV2SummaryItem, CaptureV2SummaryStats } from "./capture-v2-summary-types";

const MEDIA_TYPES = new Set(["photo", "video"]);

export function computeCaptureV2SummaryStats(
  items: CaptureV2SummaryItem[],
  sessionLastSyncedAt: string | null,
): CaptureV2SummaryStats {
  let savedItems = 0;
  let pendingItems = 0;
  let itemsNeedingDetails = 0;
  let itemsWithMedia = 0;
  let lastUpdatedAt = sessionLastSyncedAt;

  for (const item of items) {
    const syncKind = deriveCaptureV2StoredItemSyncKind({
      id: item.id,
      sync_state: item.syncState,
      upload_state: item.uploadState,
    });
    if (syncKind === "saved") savedItems += 1;
    if (syncKind === "offline_queued" || syncKind === "saving" || syncKind === "sync_error") {
      pendingItems += 1;
    }
    if (itemNeedsCaptureDetails(item)) itemsNeedingDetails += 1;
    if (MEDIA_TYPES.has(item.itemType)) itemsWithMedia += 1;

    const updatedMs = Date.parse(item.updatedAt);
    if (!Number.isNaN(updatedMs)) {
      if (!lastUpdatedAt || updatedMs > Date.parse(lastUpdatedAt)) {
        lastUpdatedAt = item.updatedAt;
      }
    }
  }

  return {
    totalItems: items.length,
    savedItems,
    pendingItems,
    itemsNeedingDetails,
    itemsWithMedia,
    lastUpdatedAt,
  };
}
