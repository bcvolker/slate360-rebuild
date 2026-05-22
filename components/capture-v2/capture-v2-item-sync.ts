import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

export type CaptureV2ItemSyncKind = "saved" | "saving" | "offline_queued" | "sync_error";

type DeriveArgs = {
  item: CaptureItemRecord;
  isActive: boolean;
  saveState?: string;
  detailsSaving?: boolean;
  detailSaveError?: string | null;
  isOnline?: boolean;
};

/** Maps committed item fields + active draft save state to filmstrip sync labels. */
export function deriveCaptureV2ItemSyncKind({
  item,
  isActive,
  saveState,
  detailsSaving,
  detailSaveError,
  isOnline = true,
}: DeriveArgs): CaptureV2ItemSyncKind {
  if (isActive && (detailSaveError || saveState === "error")) return "sync_error";
  if (
    item.sync_state === "failed" ||
    item.sync_state === "conflict" ||
    item.upload_state === "failed"
  ) {
    return "sync_error";
  }

  if (isActive && (detailsSaving || saveState === "saving")) return "saving";
  if (item.sync_state === "syncing" || item.upload_state === "uploading") return "saving";

  if (
    !isOnline ||
    item.sync_state === "pending" ||
    item.upload_state === "queued" ||
    item.id.startsWith("item-")
  ) {
    return "offline_queued";
  }

  return "saved";
}

export function itemHasUnsavedDraft(isActive: boolean, saveState?: string) {
  return isActive && saveState === "dirty";
}

/** Sync label for persisted items on the walk summary screen (no active draft). */
export function deriveCaptureV2StoredItemSyncKind(
  item: Pick<CaptureItemRecord, "id" | "sync_state" | "upload_state">,
): CaptureV2ItemSyncKind {
  if (
    item.sync_state === "failed" ||
    item.sync_state === "conflict" ||
    item.upload_state === "failed"
  ) {
    return "sync_error";
  }
  if (item.sync_state === "syncing" || item.upload_state === "uploading") return "saving";
  if (
    item.sync_state === "pending" ||
    item.upload_state === "queued" ||
    item.id.startsWith("item-")
  ) {
    return "offline_queued";
  }
  return "saved";
}

export function itemNeedsCaptureDetails(item: {
  title?: string | null;
  description?: string | null;
}) {
  return !item.title?.trim() || !item.description?.trim();
}

export const CAPTURE_V2_ITEM_SYNC_LABEL: Record<CaptureV2ItemSyncKind, string> = {
  saved: "Saved",
  saving: "Saving",
  offline_queued: "Offline queued",
  sync_error: "Sync error",
};
