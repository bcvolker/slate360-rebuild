"use client";

import { useState } from "react";
import { ThermalImageGrid, type GridItem } from "@/components/ops/thermal/ThermalImageGrid";
import { ThermalProcessPanel } from "@/components/ops/thermal/ThermalProcessPanel";
import { ThermalBatchTunePanel } from "@/components/ops/thermal/ThermalBatchTunePanel";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

/**
 * Library — browse all captures as a thumbnail grid, select some or all, then run
 * cloud processing or apply a shared tune to the selection. The grid fills the
 * space; actions act on the current selection.
 */
export function ThermalLibrary({
  sessionId,
  captures,
}: {
  sessionId: string;
  captures: StudioCapture[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const items: GridItem[] = captures.map((c) => ({
    id: c.id,
    name: c.filename,
    previewUrl: c.previewUrl,
    flaggedCount: c.anomalies?.length ?? 0,
  }));
  const allIds = captures.map((c) => c.id);
  const selectedIds = [...selected];
  const targetIds = selectedIds.length ? selectedIds : allIds;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(selected.size === captures.length ? new Set() : new Set(allIds));
  }

  if (!captures.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-[var(--mobile-app-card-border)] text-sm text-[var(--graphite-muted)]">
        No captures yet — upload or import from SlateDrop to begin.
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-0 rounded-2xl border border-[var(--mobile-app-card-border)] p-3">
        <ThermalImageGrid items={items} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
      </div>
      <div className="min-h-0 space-y-3 overflow-y-auto">
        <ThermalProcessPanel sessionId={sessionId} allIds={allIds} selectedIds={selectedIds} />
        <ThermalBatchTunePanel captureIds={targetIds} />
      </div>
    </div>
  );
}
