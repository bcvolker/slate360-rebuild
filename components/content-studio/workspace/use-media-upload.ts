"use client";

import { useCallback } from "react";

const MEDIA_CHANGED = "cs:media-changed";

/**
 * Shared upload pipeline for Content Studio source media — used by the Import
 * button, the Media Bin drop zone, and OS-file drops on the timeline.
 * presign (direct R2 PUT) → upload → enqueue ingest. Broadcasts `cs:media-changed`
 * so the Media Bin refetches. Note: API routes return the payload directly
 * (NextResponse.json(data)), so we destructure the body, not `.data`.
 */
export function useMediaUpload() {
  const uploadFiles = useCallback(async (files: File[] | FileList): Promise<{ ok: number; failed: number }> => {
    const list = Array.from(files).filter((f) => f.type.startsWith("video/") || f.type.startsWith("image/"));
    let okCount = 0;
    let failed = 0;
    for (const file of list) {
      try {
        const presignRes = await fetch("/api/content-studio/media/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
        });
        if (!presignRes.ok) throw new Error(`presign ${presignRes.status}`);
        const { uploadUrl, storageKey } = await presignRes.json();
        if (!uploadUrl || !storageKey) throw new Error("presign payload missing");

        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) throw new Error(`PUT ${put.status}`);

        const kind = file.type.startsWith("image/") ? "image" : "video";
        const ing = await fetch("/api/content-studio/media/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storageKey, filename: file.name, kind }),
        });
        if (!ing.ok) throw new Error(`ingest ${ing.status}`);
        okCount += 1;
      } catch (e) {
        failed += 1;
        console.error("[content-studio upload]", file.name, e);
      }
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MEDIA_CHANGED));
    return { ok: okCount, failed };
  }, []);

  return { uploadFiles };
}

export const MEDIA_CHANGED_EVENT = MEDIA_CHANGED;
