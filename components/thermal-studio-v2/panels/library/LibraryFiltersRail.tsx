"use client";

import { useRef, useState } from "react";
import { cameraOf, isHighDelta, isInReport } from "@/lib/thermal/curation-client";
import { uploadThermalFile } from "@/components/thermal-studio-v2/lib/api";
import type { ThermalV2Capture, ThermalV2LibraryFilter } from "@/components/thermal-studio-v2/types";

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-left text-[11px] font-medium transition-colors ${
        active
          ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
          : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
      }`}
    >
      {label}
    </button>
  );
}

/** Left rail — filters + drag-drop upload + "Import from SlateDrop" (doc §1, Tab 1). */
export function LibraryFiltersRail({
  captures,
  reportIds,
  filter,
  onFilterChange,
  sessionId,
  onUploaded,
  onOpenSlateDropImport,
}: {
  captures: ThermalV2Capture[];
  reportIds: Set<string>;
  filter: ThermalV2LibraryFilter;
  onFilterChange: (f: ThermalV2LibraryFilter) => void;
  sessionId: string;
  onUploaded: () => void;
  onOpenSlateDropImport: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cameras = Array.from(new Set(captures.map(cameraOf))).sort();
  const flaggedCount = captures.filter((c) => (c.anomalies?.length ?? 0) > 0).length;
  const inReportCount = captures.filter((c) => reportIds.has(c.id) || isInReport(c)).length;
  const highDeltaCount = captures.filter((c) => isHighDelta(c)).length;
  // W2 status filters (doc §A1): where do I see analyzed vs not — ONE place, filtered.
  const notDecodedCount = captures.filter((c) => !c.qualityMetrics).length;
  const notAiAnalyzedCount = captures.filter((c) => c.anomalies == null).length;
  const hasFindingsCount = captures.filter((c) => {
    const review = (c.metadata as Record<string, unknown> | null)?.findings_review as { accepted?: string[] } | undefined;
    return (review?.accepted?.length ?? 0) > 0;
  }).length;
  const reviewedCount = captures.filter((c) => !!(c.metadata as Record<string, unknown> | null)?.findings_review).length;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      const result = await uploadThermalFile(sessionId, list[i]);
      setStatus(result.ok ? null : result.message);
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    onUploaded();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        title="Drag radiometric image files here, or click to choose files"
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center transition-colors ${
          dragActive
            ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
            : "border-[var(--mobile-app-card-border)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.tif,.tiff"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <span className="text-xs font-semibold text-[var(--graphite-text-header)]">Drop images here</span>
        <span className="text-[10px] text-[var(--graphite-muted)]">or click to choose files</span>
        {uploading ? (
          <span className="text-[10px] text-[var(--graphite-primary)]">
            Uploading {uploading.done}/{uploading.total}…
          </span>
        ) : null}
        {status ? <span className="text-[10px] text-[#fca5a5]">{status}</span> : null}
      </div>

      <button
        type="button"
        onClick={onOpenSlateDropImport}
        className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-xs font-medium text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
      >
        + Import from SlateDrop…
      </button>

      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
          Filters
        </span>
        <Chip label={`All (${captures.length})`} active={filter === "all"} onClick={() => onFilterChange("all")} />
        <Chip label={`Flagged (${flaggedCount})`} active={filter === "flagged"} onClick={() => onFilterChange("flagged")} />
        <Chip
          label={`In report (${inReportCount})`}
          active={filter === "in_report"}
          onClick={() => onFilterChange("in_report")}
        />
        <Chip
          label={`High ΔT (${highDeltaCount})`}
          active={filter === "high_delta"}
          onClick={() => onFilterChange("high_delta")}
        />
        <Chip
          label={`Not decoded (${notDecodedCount})`}
          active={filter === "not_decoded"}
          onClick={() => onFilterChange("not_decoded")}
        />
        <Chip
          label={`Not AI-analyzed (${notAiAnalyzedCount})`}
          active={filter === "not_ai_analyzed"}
          onClick={() => onFilterChange("not_ai_analyzed")}
        />
        <Chip
          label={`Has findings (${hasFindingsCount})`}
          active={filter === "has_findings"}
          onClick={() => onFilterChange("has_findings")}
        />
        <Chip
          label={`Reviewed (${reviewedCount})`}
          active={filter === "reviewed"}
          onClick={() => onFilterChange("reviewed")}
        />
        {cameras.map((cam) => (
          <Chip key={cam} label={cam} active={filter === cam} onClick={() => onFilterChange(cam)} />
        ))}
      </div>
    </div>
  );
}
