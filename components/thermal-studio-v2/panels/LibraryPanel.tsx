"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { cameraOf, isHighDelta, isInReport } from "@/lib/thermal/curation-client";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { LibraryFiltersRail } from "@/components/thermal-studio-v2/panels/library/LibraryFiltersRail";
import { LibraryGrid } from "@/components/thermal-studio-v2/panels/library/LibraryGrid";
import { LibraryNextSteps } from "@/components/thermal-studio-v2/panels/library/LibraryNextSteps";

// Leaflet touches `window` at import time — must never enter the SSR bundle
// (same fix as the old ops/thermal ThermalTwinLayerPanel.tsx's map import).
const LibraryMap = dynamic(
  () => import("@/components/thermal-studio-v2/panels/library/LibraryMap").then((m) => m.LibraryMap),
  { ssr: false },
);
import { SlateDropImportModal } from "@/components/thermal-studio-v2/panels/library/SlateDropImportModal";
import type { useLibrarySelection } from "@/components/thermal-studio-v2/lib/useLibrarySelection";
import type { ThermalV2Capture, ThermalV2LibraryFilter, ThermalV2Scope } from "@/components/thermal-studio-v2/types";

/** Tab 1 — Library (doc §1, slice S2): triage + kick off, real APIs, no new backend. */
export function LibraryPanel({
  sessionId,
  captures,
  scope,
  selection,
  onOpenInAnalyze,
  refetchCaptures,
}: {
  sessionId: string;
  captures: ThermalV2Capture[];
  scope: ThermalV2Scope;
  selection: ReturnType<typeof useLibrarySelection>;
  /** W1: double-click a thumbnail switches the shell to the Analyze tab. */
  onOpenInAnalyze?: (id: string, index: number) => void;
  /** Audit remediation Batch 1: pulls the new row into shell state — no more "refresh to see it." */
  refetchCaptures: () => void;
}) {
  const [filter, setFilter] = useState<ThermalV2LibraryFilter>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  // MAP-1 (doc D2): Grid ⇄ Map — the only new top-level control this slice adds.
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  function handleUploaded() {
    setRefreshNote("Uploaded ✓");
    refetchCaptures();
    setTimeout(() => setRefreshNote(null), 2500);
  }
  function handleImported() {
    setRefreshNote("Imported ✓");
    refetchCaptures();
    setTimeout(() => setRefreshNote(null), 2500);
  }

  const visible = useMemo(() => {
    if (filter === "all") return captures;
    if (filter === "flagged") return captures.filter((c) => (c.anomalies?.length ?? 0) > 0);
    if (filter === "in_report") return captures.filter((c) => selection.reportIds.has(c.id) || isInReport(c));
    if (filter === "high_delta") return captures.filter((c) => isHighDelta(c));
    // W2 status filters (doc §A1).
    if (filter === "not_decoded") return captures.filter((c) => !c.qualityMetrics);
    if (filter === "not_ai_analyzed") return captures.filter((c) => c.anomalies == null);
    if (filter === "has_findings")
      return captures.filter((c) => {
        const review = (c.metadata as Record<string, unknown> | null)?.findings_review as { accepted?: string[] } | undefined;
        return (review?.accepted?.length ?? 0) > 0;
      });
    if (filter === "reviewed") return captures.filter((c) => !!(c.metadata as Record<string, unknown> | null)?.findings_review);
    return captures.filter((c) => cameraOf(c) === filter);
  }, [captures, filter, selection.reportIds]);

  const scopeIds = useMemo(() => {
    if (scope.kind === "all") return captures.map((c) => c.id);
    if (scope.kind === "selected") return captures.filter((c) => selection.selectedIds.has(c.id)).map((c) => c.id);
    return selection.focusedId ? [selection.focusedId] : [];
  }, [scope, captures, selection.selectedIds, selection.focusedId]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <V2PanelFrame
        toolbar={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-2 py-1 text-xs font-medium ${viewMode === "grid" ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`rounded-md px-2 py-1 text-xs font-medium ${viewMode === "map" ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"}`}
            >
              Map
            </button>
          </div>
        }
        left={{
          title: "Folders & filters",
          content: (
            <LibraryFiltersRail
              captures={captures}
              reportIds={selection.reportIds}
              filter={filter}
              onFilterChange={setFilter}
              sessionId={sessionId}
              onUploaded={handleUploaded}
              onOpenSlateDropImport={() => setImportOpen(true)}
            />
          ),
        }}
        center={
          viewMode === "map" ? (
            <LibraryMap
              captures={visible}
              selectedIds={selection.selectedIds}
              onToggleSelect={(id, index) => selection.click(id, index, { toggle: true })}
              onOpenInAnalyze={onOpenInAnalyze}
            />
          ) : (
            <LibraryGrid
              captures={visible}
              selectedIds={selection.selectedIds}
              reportIds={selection.reportIds}
              onClick={selection.click}
              onOpenInAnalyze={onOpenInAnalyze}
              sessionId={sessionId}
              onUploaded={handleUploaded}
            />
          )
        }
        right={{
          title: "Next steps",
          content: (
            <LibraryNextSteps
              sessionId={sessionId}
              captures={captures}
              scope={scope}
              scopeIds={scopeIds}
              totalInScope={scopeIds.length}
              onAddToReport={selection.addToReport}
            />
          ),
        }}
      />
      {refreshNote ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] px-3 py-1.5 text-xs text-[var(--graphite-muted)]">
          {refreshNote}
        </div>
      ) : null}
      {importOpen ? (
        <SlateDropImportModal
          sessionId={sessionId}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      ) : null}
    </div>
  );
}
