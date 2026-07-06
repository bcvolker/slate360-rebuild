/**
 * Client-side multipart upload orchestrator for the mobile 360 tour import flow.
 * Browser-only — drives init -> sign-parts -> PUT parts -> complete against the
 * /api/tours/[tourId]/scenes/upload/multipart/* routes. Parts are retried
 * individually (cellular connections drop mid-transfer far more often than
 * desktop broadband), and only a failed part is retried, not the whole file.
 */

export type UploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  partsDone: number;
  totalParts: number;
};

export type UploadTourSceneOptions = {
  title?: string;
  width?: number;
  height?: number;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  maxRetriesPerPart?: number;
};

export type UploadTourSceneResult = {
  id: string;
  ingestQueued: boolean;
  [key: string]: unknown;
};

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof json?.error === "string" ? json.error : `Request failed (${res.status})`);
  }
  return json as T;
}

async function putPartWithRetry(
  url: string,
  chunk: Blob,
  maxRetries: number,
  signal?: AbortSignal,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
    try {
      const res = await fetch(url, { method: "PUT", body: chunk, signal });
      if (!res.ok) throw new Error(`Part upload failed (${res.status})`);
      const etag = res.headers.get("etag");
      if (!etag) throw new Error("Part upload response had no ETag");
      return etag;
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Part upload failed");
}

export async function uploadTourScene(
  tourId: string,
  file: File,
  opts: UploadTourSceneOptions = {},
): Promise<UploadTourSceneResult> {
  const { title, width, height, onProgress, signal, maxRetriesPerPart = 3 } = opts;
  const base = `/api/tours/${tourId}/scenes/upload/multipart`;

  const init = await postJson<{ uploadId: string; key: string; partSizeBytes: number; totalParts: number }>(
    `${base}/init`,
    { filename: file.name, contentType: file.type, size: file.size, width, height },
    signal,
  );

  const partNumbers = Array.from({ length: init.totalParts }, (_, i) => i + 1);
  const { parts: signedParts } = await postJson<{ parts: Array<{ partNumber: number; signedUrl: string }> }>(
    `${base}/sign-parts`,
    { uploadId: init.uploadId, key: init.key, partNumbers },
    signal,
  );

  const uploadedParts: Array<{ partNumber: number; etag: string }> = [];
  let uploadedBytes = 0;

  try {
    for (const { partNumber, signedUrl } of signedParts) {
      const start = (partNumber - 1) * init.partSizeBytes;
      const end = Math.min(start + init.partSizeBytes, file.size);
      const chunk = file.slice(start, end);

      const etag = await putPartWithRetry(signedUrl, chunk, maxRetriesPerPart, signal);
      uploadedParts.push({ partNumber, etag });
      uploadedBytes += chunk.size;

      onProgress?.({
        uploadedBytes,
        totalBytes: file.size,
        percent: Math.round((uploadedBytes / file.size) * 100),
        partsDone: uploadedParts.length,
        totalParts: init.totalParts,
      });
    }

    const result = await postJson<UploadTourSceneResult>(
      `${base}/complete`,
      { uploadId: init.uploadId, key: init.key, title, parts: uploadedParts },
      signal,
    );
    return result;
  } catch (err) {
    // Best-effort cleanup — don't let an abort failure mask the real error.
    postJson(`${base}/abort`, { uploadId: init.uploadId, key: init.key }).catch(() => {});
    throw err;
  }
}
