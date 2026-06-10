import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";
import { PHOTO_ATTACHMENT_MAX_FILE_BYTES } from "@/lib/site-walk/photo-attachments";

type UploadResponse = { uploadUrl?: string; fileId?: string; error?: string };

export async function uploadPhotoAttachmentFile(
  sessionId: string,
  file: File,
): Promise<PhotoAttachmentFile> {
  if (file.size > PHOTO_ATTACHMENT_MAX_FILE_BYTES) {
    throw new Error(`${file.name} is over 25MB.`);
  }
  const prepared = await prepareUpload(sessionId, file);
  await putFile(prepared.uploadUrl, file);
  await completeUpload(prepared.fileId);
  return {
    id: prepared.fileId,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
}

async function prepareUpload(sessionId: string, file: File) {
  const response = await fetch("/api/site-walk/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sessionId,
      fileSizeBytes: file.size,
    }),
  });
  const data = (await response.json().catch(() => null)) as UploadResponse | null;
  if (!response.ok || !data?.uploadUrl || !data.fileId) {
    throw new Error(data?.error ?? "Could not prepare upload.");
  }
  return { uploadUrl: data.uploadUrl, fileId: data.fileId };
}

async function putFile(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error(`Upload failed for ${file.name}.`);
}

async function completeUpload(fileId: string) {
  const response = await fetch("/api/slatedrop/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
  if (!response.ok) throw new Error("Could not finalize upload.");
}
