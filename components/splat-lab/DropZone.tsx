"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyFiles, formatBytes, looksEquirectangular, type DropSummary } from "@/lib/splat-lab/file-detect";

type DroppedFile = { file: File; relativePath: string };

export function DropZone({
  onResolved,
}: {
  onResolved: (result: { path: string; suggestedIs360: boolean; summary: DropSummary }) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "uploading" | "done" | "error">("idle");
  const [summary, setSummary] = useState<DropSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (dropped: DroppedFile[]) => {
    if (dropped.length === 0) return;
    setPhase("analyzing");
    setError(null);

    let files = dropped.map((d) => ({ name: d.file.name, relativePath: d.relativePath, size: d.file.size }));
    let sum = classifyFiles(files);

    // Refine video-flat -> video-360 by actually checking a frame's aspect
    // ratio for plain .mp4/.mov drops that lack a 360-specific extension
    // (e.g. a DJI 360 drone's stitched export, or an Insta360 export renamed
    // to .mp4) — extension alone can't tell those apart from a normal video.
    const firstVideo = dropped.find((d) => /\.(mp4|mov|m4v)$/i.test(d.file.name));
    if (firstVideo && sum.kind !== "video-360") {
      try {
        const dims = await probeVideoDims(firstVideo.file);
        if (dims && looksEquirectangular(dims.width, dims.height)) {
          sum = { ...sum, kind: "video-360", suggestedIs360: true,
                  message: `${sum.message} (confirmed 2:1 equirectangular frame, ${dims.width}x${dims.height})` };
        }
      } catch { /* best effort — extension-based classification stands */ }
    }

    setSummary(sum);

    if (sum.kind === "unknown" && sum.files.every((f) => f.kind === "unknown")) {
      setPhase("error");
      setError("Could not recognize any of the dropped files as video, images, LiDAR, or RTK data.");
      return;
    }

    setPhase("uploading");
    try {
      const path = await uploadFiles(dropped, setProgress);
      setPhase("done");
      onResolved({ path, suggestedIs360: sum.suggestedIs360, summary: sum });
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }, [onResolved]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const items = e.dataTransfer.items;
    const dropped = await walkDataTransferItems(items);
    void handleFiles(dropped);
  }, [handleFiles]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const dropped: DroppedFile[] = Array.from(list).map((file) => ({
      file, relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
    void handleFiles(dropped);
    e.target.value = "";
  }, [handleFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => phase === "idle" && inputRef.current?.click()}
      className={cn(
        "flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center transition",
        dragging ? "border-[var(--twin360-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)]"
                 : "border-white/15 hover:border-white/25",
      )}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick}
        // @ts-expect-error -- webkitdirectory is a real, widely-supported non-standard attribute
        webkitdirectory=""
      />
      {phase === "idle" && (
        <>
          <UploadCloud className="size-5 text-[var(--graphite-muted)]" />
          <p className="text-xs text-[var(--graphite-text-body)]">
            Drop a 360 video, a photo mission folder, LiDAR, or RTK files here
          </p>
          <p className="font-mono text-[10px] text-[var(--graphite-muted)]">or click to choose a folder</p>
        </>
      )}
      {phase === "analyzing" && (
        <><Loader2 className="size-5 animate-spin text-[var(--twin360-blue)]" /><p className="text-xs text-[var(--graphite-muted)]">Identifying files…</p></>
      )}
      {phase === "uploading" && summary && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-[var(--graphite-text-body)]">{summary.message}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-white/10">
            <div className="h-full bg-[var(--twin360-blue)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 font-mono text-[10px] text-[var(--graphite-muted)]">{progress}%</p>
        </div>
      )}
      {phase === "done" && summary && (
        <div className="w-full">
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--graphite-primary)]">
            <CheckCircle2 className="size-4" /> {summary.message}
          </p>
          {summary.warnings.map((w) => (
            <p key={w} className="mt-1 text-[10px] text-[var(--graphite-muted)]">{w}</p>
          ))}
        </div>
      )}
      {phase === "error" && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="size-4" /> {error}
        </div>
      )}
    </div>
  );
}

async function probeVideoDims(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => { const d = { width: video.videoWidth, height: video.videoHeight }; cleanup(); resolve(d); };
    video.onerror = () => { cleanup(); resolve(null); };
    video.src = url;
  });
}

/** Walks a DataTransferItemList, recursing into dropped folders via the
 * (widely supported, if non-standard) FileSystemEntry API. */
async function walkDataTransferItems(items: DataTransferItemList): Promise<DroppedFile[]> {
  const entries: (FileSystemEntry | null)[] = [];
  for (let i = 0; i < items.length; i += 1) entries.push(items[i].webkitGetAsEntry?.() ?? null);
  const results: DroppedFile[] = [];
  await Promise.all(entries.map((entry) => entry && walkEntry(entry, "", results)));
  return results;
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: DroppedFile[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push({ file, relativePath: prefix + entry.name });
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllEntries(reader);
    await Promise.all(children.map((c) => walkEntry(c, `${prefix}${entry.name}/`, out)));
  }
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => reader.readEntries((batch) => {
      if (batch.length === 0) { resolve(all); return; }
      all.push(...batch);
      readBatch(); // readEntries only returns a page at a time — must loop until empty
    }, reject);
    readBatch();
  });
}

function uploadFiles(files: DroppedFile[], onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const { file, relativePath } of files) {
      form.append("file", file);
      form.append("relPath", relativePath);
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/splat-lab/upload");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve((JSON.parse(xhr.responseText) as { path: string }).path); }
        catch { reject(new Error("bad upload response")); }
      } else {
        reject(new Error(`upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.send(form);
  });
}
