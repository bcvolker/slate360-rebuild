import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

export const PHOTO_ANGLES_METADATA_KEY = "photo_angles";
export const PHOTO_ANGLE_LIMIT = 8;

export type PhotoAngleCaptureMode = "camera" | "upload";
export type PhotoAngleUploadState = "queued" | "uploading" | "uploaded" | "failed";

export type PhotoAngleRecord = {
  id: string;
  label: string;
  fileId?: string | null;
  s3Key?: string | null;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  captureMode: PhotoAngleCaptureMode;
  uploadState: PhotoAngleUploadState;
  createdAt: string;
  previewUrl?: string;
};

export function getPhotoAngles(metadata: unknown): PhotoAngleRecord[] {
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  const angles = record[PHOTO_ANGLES_METADATA_KEY];
  if (!Array.isArray(angles)) return [];
  return angles.map(normalizePhotoAngle).filter((angle): angle is PhotoAngleRecord => !!angle).slice(0, PHOTO_ANGLE_LIMIT);
}

export function getItemPhotoAngles(item: { metadata?: unknown } | null | undefined): PhotoAngleRecord[] {
  return getPhotoAngles(item?.metadata);
}

export function getPhotoAngleById(metadata: unknown, angleId: string): PhotoAngleRecord | null {
  return getPhotoAngles(metadata).find((angle) => angle.id === angleId) ?? null;
}

export function getPhotoAngleImageUrl(item: CaptureItemRecord | null | undefined, angleId: string | null): string | null {
  if (!item) return null;
  if (!angleId) return getCaptureImageUrl(item);
  const angle = getPhotoAngleById(item.metadata, angleId);
  if (!angle) return null;
  if (angle.previewUrl) return angle.previewUrl;
  if (!angle.s3Key || item.id.startsWith("item-")) return null;
  return `/api/site-walk/items/${encodeURIComponent(item.id)}/image?angle_id=${encodeURIComponent(angle.id)}`;
}

export function withPhotoAngle(metadata: unknown, angle: PhotoAngleRecord): Record<string, unknown> {
  const base = metadata && typeof metadata === "object" ? { ...(metadata as Record<string, unknown>) } : {};
  const angles = getPhotoAngles(base).filter((current) => current.id !== angle.id);
  base[PHOTO_ANGLES_METADATA_KEY] = [...angles, angle].slice(0, PHOTO_ANGLE_LIMIT);
  return base;
}

export function withoutPhotoAnglePreview(angle: PhotoAngleRecord): PhotoAngleRecord {
  const { previewUrl: _previewUrl, ...persisted } = angle;
  return persisted;
}

function normalizePhotoAngle(value: unknown): PhotoAngleRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.createdAt !== "string") return null;
  return {
    id: record.id,
    label: typeof record.label === "string" && record.label.trim() ? record.label : "Angle",
    fileId: typeof record.fileId === "string" ? record.fileId : null,
    s3Key: typeof record.s3Key === "string" ? record.s3Key : null,
    fileName: typeof record.fileName === "string" ? record.fileName : undefined,
    fileSize: typeof record.fileSize === "number" ? record.fileSize : undefined,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
    captureMode: record.captureMode === "upload" ? "upload" : "camera",
    uploadState: normalizeUploadState(record.uploadState),
    createdAt: record.createdAt,
    previewUrl: typeof record.previewUrl === "string" ? record.previewUrl : undefined,
  };
}

function normalizeUploadState(value: unknown): PhotoAngleUploadState {
  if (value === "queued" || value === "uploading" || value === "uploaded" || value === "failed") return value;
  return "uploaded";
}
