import { presignCaptureUpload } from "@/lib/site-walk/capture-item-client";
import { compressCaptureFile } from "@/lib/site-walk/image-compression";

export type CaptureDraftPhotoUpload = {
  s3Key: string;
  fileId: string | null;
  previewUrl: string;
};

/** Upload a capture photo to S3 without creating a site_walk_item yet. */
export async function uploadCaptureDraftPhoto(
  sessionId: string,
  file: File,
): Promise<CaptureDraftPhotoUpload> {
  const captureFile = await compressCaptureFile(file);
  const upload = await presignCaptureUpload(sessionId, captureFile);
  const put = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": captureFile.type || "image/jpeg" },
    body: captureFile,
  });
  if (!put.ok) throw new Error("Storage upload failed");
  return {
    s3Key: upload.s3Key,
    fileId: upload.fileId ?? null,
    previewUrl: URL.createObjectURL(captureFile),
  };
}

/** Resolve a persisted draft photo to a browser preview URL. */
export async function resolveCaptureDraftPreviewUrl(fileId: string): Promise<string | null> {
  const response = await fetch(
    `/api/slatedrop/download?fileId=${encodeURIComponent(fileId)}&mode=preview`,
    { cache: "no-store" },
  );
  const data = (await response.json().catch(() => null)) as { url?: string } | null;
  if (!response.ok || !data?.url) return null;
  return data.url;
}
