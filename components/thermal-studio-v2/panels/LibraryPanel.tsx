"use client";

import { useMemo, useState } from "react";
import { cameraOf, isHighDelta, isInReport } from "@/lib/thermal/curation-client";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { LibraryFiltersRail } from "@/components/thermal-studio-v2/panels/library/LibraryFiltersRail";
import { LibraryGrid } from "@/components/thermal-studio-v2/panels/library/LibraryGrid";
import { LibraryNextSteps } from "@/components/thermal-studio-v2/panels/library/LibraryNextSteps";
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
}: {
  sessionId: string;
  captures: ThermalV2Capture[];
  scope: ThermalV2Scope;
  selection: ReturnType<typeof useLibrarySelection>;
  /** W1: double-click a thumbnail switches the shell to the Analyze tab. */
  onOpenInAnalyze?: (id: string, index: number) => void;
}) {
  const [filter, setFilter] = useState<ThermalV2LibraryFilter>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return captures;
    if (filter === "flagged") return captures.filter((c) => (c.anomalies?.length ?? 0) > 0);
    if (filter === "in_report") return captures.filter((c) => selection.reportIds.has(c.id) || isInReport(c));
    if (filter === "high_delta") return captures.filter((c) => isHighDelta(c));
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
        left={{
          title: "Folders & filters",
          content: (
            <LibraryFiltersRail
              captures={captures}
              reportIds={selection.reportIds}
              filter={filter}
              onFilterChange={setFilter}
              sessionId={sessionId}
              onUploaded={() => setRefreshNote("Uploaded — refresh to see new images")}
              onOpenSlateDropImport={() => setImportOpen(true)}
            />
          ),
        }}
        center={
          <LibraryGrid
            captures={visible}
            selectedIds={selection.selectedIds}
            reportIds={selection.reportIds}
            onClick={selection.click}
            onOpenInAnalyze={onOpenInAnalyze}
            sessionId={sessionId}
            onUploaded={() => setRefreshNote("Uploaded — refresh to see new images")}
          />
        }
        right={{
          title: "Next steps",
          content: (
            <LibraryNextSteps
              sessionId={sessionId}
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
          onImported={() => setRefreshNote("Imported — refresh to see new images")}
        />
      ) : null}
    </div>
  );
}
