import { captureMetadata, type CaptureMetadata } from "@/lib/site-walk/metadata";
import type { SiteWalkCaptureMode, SiteWalkItemType } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type UploadResponse = { uploadUrl: string; s3Key: string; fileId?: string; error?: string };
type ItemResponse = { item?: CaptureItemRecord; error?: string; warnings?: string[] };

export type CreateCaptureItemParams = {
  sessionId: string;
  itemType: SiteWalkItemType;
  title: string;
  description?: string;
  fileId?: string | null;
  s3Key?: string | null;
  metadata: CaptureMetadata | Record<string, unknown>;
  file?: File;
  captureMode: SiteWalkCaptureMode;
  clientItemId?: string | null;
  clientMutationId?: string | null;
  uploadState?: "none" | "queued" | "uploading" | "uploaded" | "failed";
};

export async function presignCaptureUpload(sessionId: string, file: File): Promise<UploadResponse> {
  const response = await fetch("/api/site-walk/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "image/jpeg",
      sessionId,
      fileSizeBytes: file.size,
    }),
  });
  const upload = (await response.json().catch(() => null)) as Partial<UploadResponse> | null;
  if (!response.ok || !upload?.uploadUrl || !upload.s3Key) {
    throw new Error(upload?.error ?? "Upload preflight failed");
  }
  return { uploadUrl: upload.uploadUrl, s3Key: upload.s3Key, fileId: upload.fileId };
}

export async function createCaptureItem(params: CreateCaptureItemParams): Promise<CaptureItemRecord> {
  const body = buildCreateCaptureItemBody(params);
  const response = await fetch("/api/site-walk/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as ItemResponse | null;
  if (!response.ok || !data?.item) throw new Error(data?.error ?? "Could not save item");
  return data.item;
}

export function buildCreateCaptureItemBody(params: CreateCaptureItemParams) {
  const metadataRecord = params.metadata as Record<string, unknown>;
  const gps = isGps(metadataRecord.gps) ? metadataRecord.gps : null;
  return {
    session_id: params.sessionId,
    item_type: params.itemType,
    title: params.title,
    description: params.description,
    file_id: params.fileId ?? null,
    s3_key: params.s3Key ?? null,
    latitude: gps?.latitude ?? null,
    longitude: gps?.longitude ?? null,
    weather: metadataRecord.weather ?? null,
    metadata: {
      ...params.metadata,
      file_size: params.file?.size,
      mime_type: params.file?.type,
    },
    capture_mode: params.captureMode,
    client_item_id: params.clientItemId ?? null,
    client_mutation_id: params.clientMutationId ?? null,
    sync_state: params.uploadState === "queued" ? "pending" : "synced",
    local_created_at: new Date().toISOString(),
    local_updated_at: new Date().toISOString(),
    upload_state: params.uploadState ?? "none",
    upload_progress: params.uploadState === "queued" ? 0 : params.s3Key ? 100 : 0,
  };
}

export async function createAnnotationItem(sessionId: string, title: string, metadata: Record<string, unknown>) {
  const base = await captureMetadata();
  return createCaptureItem({
    sessionId,
    itemType: "annotation",
    title,
    description: "",
    metadata: { ...base, ...metadata },
    captureMode: "plan_pin",
  });
}

function isGps(value: unknown): value is { latitude: number; longitude: number } {
  return !!value && typeof value === "object" &&
    typeof (value as { latitude?: unknown }).latitude === "number" &&
    typeof (value as { longitude?: unknown }).longitude === "number";
}
