"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";

type ShowToast = (text: string, ok?: boolean) => void;

type UseSlateDropUploadActionsParams = {
  activeFolderId: string;
  breadcrumb: string[];
  refreshFolderFiles: (folderId: string) => Promise<void>;
  showToast: ShowToast;
  setUploadProgress: Dispatch<SetStateAction<Record<string, number>>>;
  setRealFiles: Dispatch<SetStateAction<Record<string, SlateDropFileItem[]>>>;
  /** When set, the server applies app-specific upload restrictions. */
  app_context?: string;
};

// Upload several files at once with a small concurrency cap. The cap keeps us
// well within the upload-url rate limit (10 reservations/min) for typical
// batches while still being far faster than the old strictly-sequential loop.
const UPLOAD_CONCURRENCY = 4;
// The reservation endpoint is rate-limited; on 429 we back off and retry rather
// than reporting a spurious failure (parallelism makes bursts more likely).
const MAX_RESERVE_RETRIES = 4;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Run `worker` over `items` with at most `limit` in flight; preserves order. */
async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

export function useSlateDropUploadActions({
  activeFolderId,
  breadcrumb,
  refreshFolderFiles,
  showToast,
  setUploadProgress,
  setRealFiles,
  app_context,
}: UseSlateDropUploadActionsParams) {
  const uploadFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const folderPath = breadcrumb.join("/") || activeFolderId;

    const reserveUploadUrl = async (file: File) => {
      for (let attempt = 0; ; attempt++) {
        const res = await fetch("/api/slatedrop/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderId: activeFolderId,
            folderPath,
            ...(app_context ? { app_context } : {}),
          }),
        });
        if (res.status === 429 && attempt < MAX_RESERVE_RETRIES) {
          const retryAfter = Number(res.headers.get("Retry-After"));
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2 ** attempt * 1000;
          await sleep(waitMs);
          continue;
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.message ?? "Failed to get upload URL");
        }
        const data = await res.json();
        if (!data.uploadUrl || !data.fileId) throw new Error("Upload reservation failed");
        return data as { uploadUrl: string; fileId: string; s3Key?: string };
      }
    };

    const uploadOne = async (file: File, index: number): Promise<boolean> => {
      const key = `${index}-${file.name}-${Date.now()}`;
      try {
        const { uploadUrl, fileId, s3Key } = await reserveUploadUrl(file);

        setUploadProgress((prev) => ({ ...prev, [key]: 10 }));
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error("S3 upload failed");

        setUploadProgress((prev) => ({ ...prev, [key]: 80 }));
        const completeResponse = await fetch("/api/slatedrop/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });
        if (!completeResponse.ok) throw new Error("Upload finalization failed");

        setUploadProgress((prev) => ({ ...prev, [key]: 100 }));

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const newFile: SlateDropFileItem = {
          id: fileId ?? key,
          name: file.name,
          size: file.size,
          type: ext,
          modified: new Date().toISOString().slice(0, 10),
          folderId: activeFolderId,
          s3Key: s3Key ?? undefined,
        };

        setRealFiles((prev) => ({
          ...prev,
          [activeFolderId]: [...(prev[activeFolderId] ?? []), newFile],
        }));
        return true;
      } catch (error) {
        console.error("[SlateDrop] upload error:", error);
        showToast(`Failed to upload ${file.name}`, false);
        return false;
      } finally {
        setTimeout(() => {
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 1000);
      }
    };

    const results = await runPool(files, UPLOAD_CONCURRENCY, uploadOne);
    const succeeded = results.filter(Boolean).length;

    await refreshFolderFiles(activeFolderId);

    if (succeeded === files.length) {
      showToast(`${succeeded} file${succeeded > 1 ? "s" : ""} uploaded`);
    } else if (succeeded > 0) {
      showToast(`${succeeded} of ${files.length} files uploaded`, false);
    }
    // If nothing succeeded, the per-file error toasts already explained why.
  }, [activeFolderId, app_context, breadcrumb, refreshFolderFiles, setRealFiles, setUploadProgress, showToast]);

  return {
    uploadFiles,
  };
}
