import { captureMetadata } from "@/lib/site-walk/metadata";
import {
  createCaptureItem,
  presignCaptureUpload,
} from "@/lib/site-walk/capture-item-client";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import type { SiteWalkCaptureMode, SiteWalkItemType } from "@/lib/types/site-walk";
import type { CapturePersistContext, CapturePersistResult } from "./types";

export async function persistPhotoCapture(
  file: File,
  ctx: CapturePersistContext,
  title = "",
): Promise<CapturePersistResult> {
  return persistFileBackedCapture(file, ctx, {
    itemType: "photo",
    title: title || file.name,
    captureMode: "camera",
  });
}

type FileBackedCaptureOptions = {
  itemType: SiteWalkItemType;
  title?: string;
  captureMode?: SiteWalkCaptureMode;
  metadataExtras?: Record<string, unknown>;
};

export async function persistFileBackedCapture(
  file: File,
  ctx: CapturePersistContext,
  options: FileBackedCaptureOptions,
): Promise<CapturePersistResult> {
  const metadata = await captureMetadata();
  const upload = await presignCaptureUpload(ctx.sessionId, file);
  const put = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error("Storage upload failed");

  const item = await createCaptureItem({
    sessionId: ctx.sessionId,
    itemType: options.itemType,
    title: options.title?.trim() || file.name,
    fileId: upload.fileId ?? null,
    s3Key: upload.s3Key,
    metadata: {
      ...metadata,
      ...options.metadataExtras,
      kind: options.itemType,
    },
    file,
    captureMode: options.captureMode ?? "upload",
    clientItemId: createOfflineId("item"),
    clientMutationId: createOfflineId("mutation"),
  });

  return { item };
}

export async function persistPhoto360Capture(
  file: File,
  ctx: CapturePersistContext,
): Promise<CapturePersistResult> {
  return persistFileBackedCapture(file, ctx, {
    itemType: "photo_360",
    metadataExtras: { is_360: true, projection: "equirectangular" },
  });
}

export async function persistFileAttachmentCapture(
  file: File,
  ctx: CapturePersistContext,
): Promise<CapturePersistResult> {
  return persistFileBackedCapture(file, ctx, {
    itemType: "file_attachment",
    metadataExtras: { original_filename: file.name },
  });
}

export async function persistTextNoteCapture(
  text: string,
  ctx: CapturePersistContext,
  mode: "text" | "voice",
): Promise<CapturePersistResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Note text is required");

  const metadata = await captureMetadata();
  const itemType = mode === "voice" ? "voice_note" : "text_note";
  const captureMode = mode === "voice" ? "voice" : "text";

  const item = await createCaptureItem({
    sessionId: ctx.sessionId,
    itemType,
    title: trimmed.slice(0, 80),
    description: trimmed,
    metadata: { ...metadata, note_mode: mode },
    captureMode,
    clientItemId: createOfflineId("item"),
    clientMutationId: createOfflineId("mutation"),
  });

  return { item };
}
