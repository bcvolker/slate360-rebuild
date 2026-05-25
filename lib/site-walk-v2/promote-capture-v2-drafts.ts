import { captureMetadata } from "@/lib/site-walk/metadata";
import { buildCreateCaptureItemBody } from "@/lib/site-walk/capture-item-client";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import {
  withPhotoAttachmentPins,
  type PhotoAttachmentPin,
} from "@/lib/site-walk/photo-attachments";
import type { CaptureStopDraftRecord, CaptureV2StopDraftStore } from "./capture-stop-drafts";

type StopLabelMap = Record<string, string>;

function buildPhotoPin(draft: CaptureStopDraftRecord): PhotoAttachmentPin[] {
  if (!draft.pinPct) return [];
  return [
    {
      id: createOfflineId("pin"),
      xPct: draft.pinPct.x,
      yPct: draft.pinPct.y,
      label: draft.classification ?? "",
      note: draft.notes.trim(),
      files: [],
      createdAt: new Date().toISOString(),
    },
  ];
}

function draftHasContent(draft: CaptureStopDraftRecord) {
  return Boolean(draft.photoS3Key || draft.notes.trim() || draft.classification || draft.pinPct);
}

export type PromoteCaptureV2DraftsResult = {
  promotedCount: number;
};

/** Promote completed stop drafts into persisted site_walk_items. */
export async function promoteCaptureV2StopDrafts(
  sessionId: string,
  store: CaptureV2StopDraftStore,
  stopLabels: StopLabelMap,
): Promise<PromoteCaptureV2DraftsResult> {
  const drafts = Object.values(store.stops)
    .filter((draft) => draft.complete && draftHasContent(draft))
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt));

  let promotedCount = 0;
  for (const draft of drafts) {
    const metadata = await captureMetadata();
    const pins = buildPhotoPin(draft);
    const title = stopLabels[draft.stopId]?.trim() || `Stop ${draft.stopId}`;
    const description = draft.notes.trim() || null;
    const itemType = draft.photoS3Key ? "photo" : "text_note";

    const body = buildCreateCaptureItemBody({
      sessionId,
      itemType,
      title,
      description: description ?? undefined,
      fileId: draft.photoFileId,
      s3Key: draft.photoS3Key,
      metadata: {
        ...metadata,
        ...withPhotoAttachmentPins({}, pins),
        capture_v2_stop_id: draft.stopId,
      },
      captureMode: draft.photoS3Key ? "camera" : "text",
      clientItemId: createOfflineId("item"),
      clientMutationId: createOfflineId("mutation"),
    });

    const response = await fetch("/api/site-walk/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        category: draft.classification ?? null,
        description,
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      const stopLabel = stopLabels[draft.stopId]?.trim() || draft.stopId;
      throw new Error(data?.error ?? `Could not save capture for ${stopLabel}`);
    }
    promotedCount += 1;
  }

  return { promotedCount };
}
