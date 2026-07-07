"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { TourMobileProjectPicker, type TourMobileProject } from "./mobile/TourMobileProjectPicker";

/** Full-bleed drag-and-drop hero — the entry point into the builder. Dropping
 * or picking files creates the tour and hands the FileList straight to the
 * workspace, which uploads them the moment it mounts (see TourStudioShell's
 * pendingFiles prop) — no separate "name your tour first" step in the way. */
export function TourImportZone({
  projects,
  onCreated,
}: {
  projects: TourMobileProject[];
  onCreated: (tourId: string, files: FileList) => void;
}) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    if (!files.length || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Untitled tour — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          projectId: projectId ?? undefined,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const tour = json?.data ?? json;
      onCreated(tour.id, files);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="w-64">
          <TourMobileProjectPicker projects={projects} selectedProjectId={projectId} onChange={setProjectId} />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition ${
          dragOver
            ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
            : "border-[var(--mobile-app-card-border)] hover:border-[var(--graphite-primary)]"
        }`}
      >
        {creating ? (
          <Loader2 className="size-8 animate-spin text-[var(--graphite-primary)]" />
        ) : (
          <UploadCloud className="size-8 text-[var(--graphite-muted)]" />
        )}
        <div>
          <p className="text-sm font-medium text-[var(--graphite-text-header)]">
            {creating ? "Creating your tour…" : "Drop 360° panoramas here to start a new tour"}
          </p>
          <p className="mt-1 text-xs text-[var(--graphite-muted)]">
            or click to choose files — equirectangular JPG/PNG, 2:1 aspect ratio
          </p>
        </div>
      </div>
    </div>
  );
}
