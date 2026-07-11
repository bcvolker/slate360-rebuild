"use client";

import { useState } from "react";
import { dispatchThermalJob } from "@/components/thermal-studio-v2/lib/api";
import { downloadBlob, exportCapturesToZip } from "@/components/thermal-studio-v2/lib/export-engine";
import type { ThermalV2Capture, ThermalV2Scope } from "@/components/thermal-studio-v2/types";

/**
 * Right rail — the ONE next-steps panel (doc §1, Tab 1): every action states
 * its scope, reading the single global Scope pill. No duplicate process panel.
 */
export function LibraryNextSteps({
  sessionId,
  captures,
  scope,
  scopeIds,
  onAddToReport,
  totalInScope,
}: {
  sessionId: string;
  /** S8.5 export engine needs each capture's full metadata (tuning/palette/spots), not just its id. */
  captures: ThermalV2Capture[];
  scope: ThermalV2Scope;
  scopeIds: string[];
  onAddToReport: (ids: string[]) => void;
  totalInScope: number;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const disabled = totalInScope === 0 || busy;

  async function runExport() {
    setBusy(true);
    setStatus("Exporting…");
    const unit = window.localStorage.getItem("thermal-v2-unit") === "C" ? "C" : "F";
    const scoped = captures.filter((c) => scopeIds.includes(c.id));
    const { zipBlob, exportedCount, skipped } = await exportCapturesToZip(scoped, unit);
    if (exportedCount > 0) {
      downloadBlob(zipBlob, `thermal-export-${new Date().toISOString().slice(0, 10)}.zip`);
    }
    setStatus(
      skipped.length
        ? `Exported ${exportedCount} — skipped ${skipped.length} (no temperature data)`
        : `Exported ${exportedCount} image${exportedCount === 1 ? "" : "s"}`,
    );
    setBusy(false);
  }

  // R1: disable-while-pending — the server also dedupes (dedupe_key), but a
  // client-side guard means a fast double-click never even sends a second
  // request while the first is still in flight.
  async function run(jobType: "extract" | "analyze", label: string) {
    setBusy(true);
    setStatus(`${label}…`);
    const result = await dispatchThermalJob(sessionId, jobType, scopeIds);
    setStatus(result.message);
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => void run("extract", "Decoding")}
        title="Turn raw camera files into per-pixel temperature data"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Decode temperatures ({totalInScope})
        <div className="mt-0.5 text-[10px] font-normal text-[var(--graphite-muted)]">
          Reads the raw file so every pixel has a real temperature
        </div>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void run("analyze", "Running AI")}
        title="Have AI scan the decoded images for possible problems"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Find problems with AI ({totalInScope})
        <div className="mt-0.5 text-[10px] font-normal text-[var(--graphite-muted)]">
          Suggests hot/cold spots for you to accept, edit, or dismiss
        </div>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAddToReport(scopeIds)}
        title="Add these images to the report you're building"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ★ Add {totalInScope} to report
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void runExport()}
        title="Download Clean + Annotated PNGs, CSVs, and metadata for these images as a ZIP"
        className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Export {totalInScope}
        <div className="mt-0.5 text-[10px] font-normal text-[var(--graphite-muted)]">
          Clean + annotated PNG, measurement CSV, full-grid CSV, metadata JSON — zipped
        </div>
      </button>

      {status ? <span className="text-[11px] text-[var(--graphite-muted)]">{status}</span> : null}

      <div className="mt-auto border-t border-[var(--mobile-app-card-border)] pt-2 text-[10px] text-[var(--graphite-muted)]">
        Scope: {scope.kind === "image" ? "This image" : scope.kind === "selected" ? `Selected (${scope.count})` : `All (${scope.count})`}
      </div>
    </div>
  );
}
