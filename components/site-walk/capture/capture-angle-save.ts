import { presignCaptureUpload } from "@/lib/site-walk/capture-item-client";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import { queueOfflineItemPatch } from "@/lib/site-walk/offline-capture";
import { getItemPhotoAngles, withPhotoAngle, withoutPhotoAnglePreview, type PhotoAngleCaptureMode, type PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { UpdateItemPayload } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type SaveCaptureAngleParams = {
  sessionId: string;
  item: CaptureItemRecord;
  file: File;
  previewUrl: string;
  captureMode: PhotoAngleCaptureMode;
  onLocalItem: (item: CaptureItemRecord) => void;
};

type PatchResponse = { item?: CaptureItemRecord; error?: string };

export async function saveCaptureAngle({ sessionId, item, file, previewUrl, captureMode, onLocalItem }: SaveCaptureAngleParams): Promise<PhotoAngleRecord> {
  const createdAt = new Date().toISOString();
  const optimisticAngle: PhotoAngleRecord = {
    id: createOfflineId("angle"),
    label: `Angle ${getItemPhotoAngles(item).length + 2}`,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "image/jpeg",
    captureMode,
    uploadState: isOffline() ? "queued" : "uploading",
    createdAt,
    previewUrl,
  };

  onLocalItem({ ...item, metadata: withPhotoAngle(item.metadata, optimisticAngle), sync_state: "pending", updated_at: createdAt });

  if (isOffline() || item.id.startsWith("item-")) {
    const queuedAngle: PhotoAngleRecord = { ...optimisticAngle, uploadState: "queued" };
    await queueOfflineAnglePatch(sessionId, item, queuedAngle);
    onLocalItem({ ...item, metadata: withPhotoAngle(item.metadata, queuedAngle), sync_state: "pending", updated_at: new Date().toISOString() });
    return queuedAngle;
  }

  try {
    const upload = await presignCaptureUpload(sessionId, file);
    const put = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!put.ok) throw new Error("Angle upload failed");
    await completeAngleUpload(upload.fileId);

    const savedAngle: PhotoAngleRecord = {
      ...optimisticAngle,
      fileId: upload.fileId ?? null,
      s3Key: upload.s3Key,
      uploadState: "uploaded",
    };
    const persistedMetadata = withPhotoAngle(item.metadata, withoutPhotoAnglePreview(savedAngle));
    const savedItem = await patchAngleMetadata(item.id, persistedMetadata);
    onLocalItem({ ...savedItem, metadata: withPhotoAngle(savedItem.metadata, savedAngle), sync_state: "synced", updated_at: new Date().toISOString() });
    return savedAngle;
  } catch {
    const failedAngle: PhotoAngleRecord = { ...optimisticAngle, uploadState: "failed" };
    await queueOfflineAnglePatch(sessionId, item, failedAngle);
    onLocalItem({ ...item, metadata: withPhotoAngle(item.metadata, failedAngle), sync_state: "pending", updated_at: new Date().toISOString() });
    return failedAngle;
  }
}

async function patchAngleMetadata(itemId: string, metadata: Record<string, unknown>): Promise<CaptureItemRecord> {
  const payload: UpdateItemPayload = { metadata, sync_state: "synced" };
  const response = await fetch(`/api/site-walk/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as PatchResponse | null;
  if (!response.ok || !data?.item) throw new Error(data?.error ?? "Angle metadata save failed");
  return data.item;
}

async function queueOfflineAnglePatch(sessionId: string, item: CaptureItemRecord, angle: PhotoAngleRecord) {
  const metadata = withPhotoAngle(item.metadata, withoutPhotoAnglePreview(angle));
  await queueOfflineItemPatch(sessionId, item, { metadata, sync_state: "synced" });
}

async function completeAngleUpload(fileId: string | null | undefined) {
  if (!fileId) return;
  await fetch("/api/slatedrop/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  }).catch(() => undefined);
}

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
