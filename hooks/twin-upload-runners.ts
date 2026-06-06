import type { MutableRefObject } from "react";
import { twinApiPost, type InitUploadRow } from "@/hooks/twin-upload-api";
import type { TwinFileUploadState, TwinUploadTarget } from "@/hooks/useMultipartTwinUpload";

const MAX_PART_RETRIES = 3;

type RunnerCtx = {
  captureId: string | null;
  pausedRef: MutableRefObject<boolean>;
  abortedRef: MutableRefObject<boolean>;
  updateFile: (index: number, patch: Partial<TwinFileUploadState>) => void;
  setCaptureId: (id: string) => void;
};

export async function runSingleTwinUpload(
  ctx: RunnerCtx,
  target: TwinUploadTarget,
  file: File,
  index: number,
  sortOrder: number,
) {
  const presign = await twinApiPost<{
    captureId: string;
    assetId: string;
    key: string;
    signedUrl: string;
  }>("/api/digital-twin/upload/single", {
    phase: "presign",
    space_id: target.spaceId,
    project_id: target.projectId,
    capture_id: target.captureId ?? ctx.captureId ?? undefined,
    title: target.title,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    sortOrder,
  });

  ctx.setCaptureId(presign.captureId);
  ctx.updateFile(index, { assetId: presign.assetId, key: presign.key, status: "uploading", progress: 10 });
  if (ctx.abortedRef.current) return;

  const putRes = await fetch(presign.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error(`Storage PUT failed (${putRes.status})`);

  ctx.updateFile(index, { progress: 90 });
  await twinApiPost("/api/digital-twin/upload/single", {
    phase: "finalize",
    assetId: presign.assetId,
    key: presign.key,
    sizeBytes: file.size,
  });
  ctx.updateFile(index, { status: "complete", progress: 100 });
}

export async function runMultipartTwinUpload(
  ctx: RunnerCtx,
  file: File,
  index: number,
  initRow: InitUploadRow,
  resolvedCaptureId: string,
) {
  const parts: { partNumber: number; etag: string; sizeBytes: number }[] = [];

  for (let partNumber = 1; partNumber <= initRow.totalParts; partNumber++) {
    while (ctx.pausedRef.current) {
      ctx.updateFile(index, { status: "paused" });
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (ctx.abortedRef.current) return;
    }

    ctx.updateFile(index, { status: "uploading" });
    const start = (partNumber - 1) * initRow.partSizeBytes;
    const chunk = file.slice(start, Math.min(start + initRow.partSizeBytes, file.size));

    let etag = "";
    for (let attempt = 1; attempt <= MAX_PART_RETRIES; attempt++) {
      if (ctx.abortedRef.current) return;

      const sign = await twinApiPost<{ signedUrl: string }>("/api/digital-twin/upload/sign-part", {
        uploadId: initRow.uploadId,
        key: initRow.key,
        partNumber,
      });

      const putRes = await fetch(sign.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: chunk,
      });

      if (putRes.ok) {
        etag = putRes.headers.get("etag") ?? putRes.headers.get("ETag") ?? "";
        if (!etag) throw new Error("Missing ETag — check R2 CORS ExposeHeaders");
        break;
      }
      if (attempt === MAX_PART_RETRIES) {
        throw new Error(`Part ${partNumber} failed after ${MAX_PART_RETRIES} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }

    parts.push({ partNumber, etag, sizeBytes: chunk.size });
    ctx.updateFile(index, { progress: Math.round((partNumber / initRow.totalParts) * 90) });
  }

  await twinApiPost("/api/digital-twin/upload/complete", {
    uploadId: initRow.uploadId,
    key: initRow.key,
    parts,
  });

  ctx.updateFile(index, {
    status: "complete",
    progress: 100,
    assetId: initRow.assetId,
    uploadId: initRow.uploadId,
    key: initRow.key,
  });
  ctx.setCaptureId(resolvedCaptureId);
}
