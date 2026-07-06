"use client";

import { useRef, useState } from "react";
import type { ProjectTour } from "@/lib/types/tours";
import { detectEquirect, type EquirectDetection } from "@/lib/tours/equirect-detect";
import { uploadTourScene } from "@/lib/tours/mobile-uploader";
import { TourMobileQueueItem } from "@/components/tours/mobile/TourMobileQueueItem";
import { TourMobileProjectPicker, type TourMobileProject } from "@/components/tours/mobile/TourMobileProjectPicker";

type QueueStatus = "detecting" | "queued" | "uploading" | "done" | "error";

export type QueueEntry = {
  id: string;
  file: File;
  previewUrl: string;
  detection: EquirectDetection | null;
  status: QueueStatus;
  percent: number;
  error: string | null;
};

type Screen = "home" | "review" | "done";

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
}

export function TourMobileImportShell({
  recentTours,
  projects,
}: {
  recentTours: ProjectTour[];
  projects: TourMobileProject[];
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [tourId, setTourId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesPicked(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const entries: QueueEntry[] = files.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      detection: null,
      status: "detecting",
      percent: 0,
      error: null,
    }));

    setQueue((prev) => [...prev, ...entries]);
    setScreen("review");

    for (const entry of entries) {
      const detection = await detectEquirect(entry.file, entry.file.name);
      setQueue((prev) =>
        prev.map((q) => (q.id === entry.id ? { ...q, detection, status: "queued" } : q)),
      );
    }
  }

  function removeEntry(id: string) {
    setQueue((prev) => {
      const target = prev.find((q) => q.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  }

  async function startUpload() {
    setIsUploading(true);
    setUploadError(null);

    try {
      let activeTourId = tourId;
      if (!activeTourId) {
        const res = await fetch("/api/tours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Tour — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
            projectId: selectedProjectId ?? undefined,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to create tour");
        activeTourId = json.id;
        setTourId(activeTourId);
      }

      for (const entry of queue) {
        if (entry.status === "done") continue;
        setQueue((prev) => prev.map((q) => (q.id === entry.id ? { ...q, status: "uploading" } : q)));

        try {
          await uploadTourScene(activeTourId!, entry.file, {
            title: entry.file.name.replace(/\.[^.]+$/, ""),
            width: entry.detection?.width,
            height: entry.detection?.height,
            onProgress: (p) => {
              setQueue((prev) => prev.map((q) => (q.id === entry.id ? { ...q, percent: p.percent } : q)));
            },
          });
          setQueue((prev) => prev.map((q) => (q.id === entry.id ? { ...q, status: "done", percent: 100 } : q)));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setQueue((prev) => prev.map((q) => (q.id === entry.id ? { ...q, status: "error", error: message } : q)));
        }
      }

      setScreen("done");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to start upload");
    } finally {
      setIsUploading(false);
    }
  }

  const readyCount = queue.filter((q) => q.status === "queued" || q.status === "done").length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto p-4 text-[var(--graphite-text-body)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => handleFilesPicked(e.target.files)}
      />

      <header className="flex items-center justify-between">
        <h1 className="font-mono text-xs uppercase tracking-wide text-[var(--graphite-muted)]">360° Tours</h1>
      </header>

      {screen === "home" && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center font-mono text-sm uppercase tracking-wide text-[var(--graphite-primary)] transition hover:bg-white/[0.07]"
          >
            + Import 360° Photos
          </button>
          <p className="text-xs text-[var(--graphite-muted)]">
            Export a finished 2:1 panorama JPEG from your camera or drone app first — raw camera files
            (.insp/.insv/.360/.dng) aren&apos;t supported yet.
          </p>

          {recentTours.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
                Recent tours
              </h2>
              {recentTours.map((tour) => (
                <div
                  key={tour.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <div className="font-medium">{tour.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
                    {tour.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {screen === "review" && (
        <>
          <div className="flex flex-col gap-2">
            {queue.map((entry) => (
              <TourMobileQueueItem key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center font-mono text-xs uppercase tracking-wide text-[var(--graphite-muted)]"
          >
            + Add more photos
          </button>

          {!tourId && (
            <TourMobileProjectPicker
              projects={projects}
              selectedProjectId={selectedProjectId}
              onChange={setSelectedProjectId}
            />
          )}

          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

          <button
            type="button"
            disabled={isUploading || readyCount === 0}
            onClick={startUpload}
            className="rounded-xl bg-[var(--graphite-primary)] px-4 py-3 text-center font-mono text-sm uppercase tracking-wide text-black disabled:opacity-40"
          >
            {isUploading ? "Uploading…" : `Start Tour (${readyCount})`}
          </button>
        </>
      )}

      {screen === "done" && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm">
            {queue.filter((q) => q.status === "done").length} of {queue.length} photos uploaded.
          </p>
          <p className="text-xs text-[var(--graphite-muted)]">
            Processing continues in the background. Open the desktop 360 Tour Builder to arrange
            scenes, set the start view, and publish a share link.
          </p>
          <button
            type="button"
            onClick={() => {
              setScreen("home");
              setQueue([]);
              setTourId(null);
            }}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center font-mono text-xs uppercase tracking-wide text-[var(--graphite-primary)]"
          >
            Import another tour
          </button>
        </div>
      )}
    </div>
  );
}
