"use client";

import { useRef, useState } from "react";
import { cameraOf, isHighDelta, isInReport } from "@/lib/thermal/curation-client";
import { uploadThermalFile } from "@/components/thermal-studio-v2/lib/api";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/**
 * Center hero — thumbnail grid. Plain responsive CSS grid (matches the old
 * ThermalImageGrid); swap for a virtualizer if a session's image count grows
 * large enough to need it — not needed at typical session sizes today.
 */
export function LibraryGrid({
  captures,
  selectedIds,
  reportIds,
  onClick,
  onOpenInAnalyze,
  sessionId,
  onUploaded,
}: {
  captures: ThermalV2Capture[];
  selectedIds: Set<string>;
  reportIds: Set<string>;
  onClick: (id: string, index: number, opts: { shift?: boolean; toggle?: boolean }) => void;
  /** W1: double-click a thumbnail jumps straight to Analyze on that image. */
  onOpenInAnalyze?: (id: string, index: number) => void;
  sessionId?: string;
  onUploaded?: () => void;
}) {
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !sessionId) return;
    const list = Array.from(files);
    setUploading({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      await uploadThermalFile(sessionId, list[i]);
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    onUploaded?.();
  }

  if (!captures.length) {
    // W1 "Start strip" (doc): one verb, not a wall of empty-state copy.
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <span className="text-sm font-semibold text-[var(--graphite-text-header)]">
          Drop thermal photos to begin — radiometric data is preserved
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.tif,.tiff"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
        >
          Choose files
        </button>
        {uploading ? (
          <span className="text-[11px] text-[var(--graphite-muted)]">
            Uploading {uploading.done}/{uploading.total}…
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid h-full auto-rows-max grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 overflow-y-auto p-3">
      {captures.map((c, i) => {
        const selected = selectedIds.has(c.id);
        const findingCount = c.anomalies?.length ?? 0;
        const processed = Boolean((c.qualityMetrics as Record<string, unknown> | null)?.is_radiometric);
        const paired = Boolean((c.metadata as Record<string, unknown> | null)?.visual_pair_id);
        const flagged = isHighDelta(c);
        const inReport = reportIds.has(c.id) || isInReport(c);
        return (
          <button
            key={c.id}
            type="button"
            title={`${c.filename} — ${cameraOf(c)} (double-click to analyze)`}
            onClick={(e) => onClick(c.id, i, { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey })}
            onDoubleClick={() => onOpenInAnalyze?.(c.id, i)}
            className={`group relative flex aspect-square flex-col overflow-hidden rounded-lg border text-left transition-colors ${
              selected
                ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]"
                : "border-[var(--mobile-app-card-border)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_45%,var(--mobile-app-card-border))]"
            }`}
          >
            {c.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.previewUrl} alt={c.filename} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--graphite-canvas-deep)] text-[10px] text-[var(--graphite-muted)]">
                {c.filename}
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1">
              <span
                title={processed ? "Decoded" : "Not decoded yet"}
                className={`rounded px-1 text-[9px] font-bold ${
                  processed
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_70%,transparent)] text-[var(--graphite-canvas)]"
                    : "bg-black/50 text-[var(--graphite-muted)]"
                }`}
              >
                {processed ? "✓" : "…"}
              </span>
              {paired ? (
                <span title="Has a paired visual photo" className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              ) : null}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-1">
              {findingCount > 0 ? (
                <span
                  title={`${findingCount} finding${findingCount === 1 ? "" : "s"}`}
                  className={`rounded px-1 text-[9px] font-bold ${
                    flagged ? "bg-[color-mix(in_srgb,#ef4444_60%,transparent)] text-white" : "bg-black/50 text-[var(--graphite-text-header)]"
                  }`}
                >
                  {findingCount}
                </span>
              ) : (
                <span />
              )}
              {inReport ? (
                <span title="In report" className="text-[10px] text-[var(--graphite-primary)]">
                  ★
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
