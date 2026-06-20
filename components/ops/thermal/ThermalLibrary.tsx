"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThermalImageGrid, type GridItem } from "@/components/ops/thermal/ThermalImageGrid";
import { ThermalProcessPanel } from "@/components/ops/thermal/ThermalProcessPanel";
import { ThermalBatchTunePanel } from "@/components/ops/thermal/ThermalBatchTunePanel";
import { ThermalInspectionProfiles } from "@/components/ops/thermal/ThermalInspectionProfiles";
import { ThermalSlateDropPicker } from "@/components/ops/thermal/ThermalSlateDropPicker";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import { cameraOf, isHighDelta } from "@/lib/thermal/curation-client";

type Filter = "all" | "flagged" | "in_report" | "high_delta" | string; // string = camera label

/**
 * Library — browse all captures as a thumbnail grid, curate the report set (★),
 * filter, select some/all, then run cloud processing or apply a shared tune.
 * Report-set order is owned by the shell (shared with Report Builder).
 */
export function ThermalLibrary({
  sessionId,
  captures,
  onOpenCapture,
  reportOrder,
  onToggleInReport,
  onAddToReport,
}: {
  sessionId: string;
  captures: StudioCapture[];
  onOpenCapture?: (id: string) => void;
  reportOrder: string[];
  onToggleInReport: (id: string) => void;
  onAddToReport: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [showPicker, setShowPicker] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [pairNote, setPairNote] = useState<string | null>(null);
  const inReport = useMemo(() => new Set(reportOrder), [reportOrder]);

  const pairedCount = useMemo(
    () =>
      captures.filter(
        (c) => (c.metadata as Record<string, unknown> | null)?.visual_pair_id,
      ).length,
    [captures],
  );

  async function autoPair() {
    setPairing(true);
    setPairNote(null);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/pair-visual`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Pairing failed");
      const linked = json.data?.linked ?? json.linked ?? 0;
      setPairNote(`${linked} image${linked === 1 ? "" : "s"} paired.`);
      router.refresh();
    } catch (err) {
      setPairNote(err instanceof Error ? err.message : "Pairing failed");
    } finally {
      setPairing(false);
    }
  }

  const cameras = useMemo(() => {
    const set = new Set<string>();
    captures.forEach((c) => set.add(cameraOf(c)));
    return [...set].sort();
  }, [captures]);

  const visible = useMemo(() => {
    if (filter === "all") return captures;
    if (filter === "flagged") return captures.filter((c) => (c.anomalies?.length ?? 0) > 0);
    if (filter === "in_report") return captures.filter((c) => inReport.has(c.id));
    if (filter === "high_delta") return captures.filter((c) => isHighDelta(c));
    return captures.filter((c) => cameraOf(c) === filter); // camera label
  }, [captures, filter, inReport]);

  const items: GridItem[] = visible.map((c) => ({
    id: c.id,
    name: c.filename,
    previewUrl: c.previewUrl,
    flaggedCount: c.anomalies?.length ?? 0,
    inReport: inReport.has(c.id),
  }));
  const visibleIds = visible.map((c) => c.id);
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
    const allVisibleSelected = visibleIds.every((id) => selected.has(id));
    setSelected(allVisibleSelected ? new Set() : new Set(visibleIds));
  }

  if (!captures.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] text-sm text-[var(--graphite-muted)]">
        <p>No captures yet — upload, or import images you already filed in SlateDrop.</p>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="rounded-lg bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)]"
        >
          Import from SlateDrop folders
        </button>
        {showPicker ? <ThermalSlateDropPicker sessionId={sessionId} onClose={() => setShowPicker(false)} /> : null}
      </div>
    );
  }

  const chip = (id: Filter, label: string, count?: number) => {
    const active = filter === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setFilter(id)}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          active
            ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
            : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        }`}
      >
        {label}{count != null ? ` (${count})` : ""}
      </button>
    );
  };

  const eyebrow =
    "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]";

  return (
    // Same frame as Inspect: file management LEFT, the grid CENTER, tools RIGHT.
    <div className="flex h-full min-h-0 gap-2 p-2">
      {/* LEFT: filters + import */}
      <aside className="flex w-52 shrink-0 flex-col gap-2 overflow-y-auto rounded-xl border border-[var(--mobile-app-card-border)] p-2">
        <span className={eyebrow}>Filter</span>
        <div className="flex flex-wrap gap-1.5">
          {chip("all", "All", captures.length)}
          {chip("flagged", "Flagged", captures.filter((c) => (c.anomalies?.length ?? 0) > 0).length)}
          {chip("in_report", "In report", inReport.size)}
          {chip("high_delta", "High ΔT", captures.filter((c) => isHighDelta(c)).length)}
          {cameras.length > 1 ? cameras.map((cam) => chip(cam, cam)) : null}
        </div>
        <div className="mt-1 border-t border-[var(--mobile-app-card-border)] pt-2">
          <span className={eyebrow}>Bring in files</span>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-1.5 block w-full rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1.5 text-left text-xs font-medium text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]"
          >
            ＋ From SlateDrop
          </button>
        </div>
      </aside>

      {/* CENTER: the thumbnail grid */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[var(--mobile-app-card-border)] p-2">
        {onOpenCapture ? (
          <p className="shrink-0 pb-2 text-[11px] text-[var(--graphite-muted)]">
            Click an image to open it in <span className="font-semibold text-[var(--graphite-text-body)]">Inspect</span> ·
            ✓ corner selects for batch · ★ adds to the report set.
          </p>
        ) : null}
        <div className="min-h-0 flex-1">
          <ThermalImageGrid
            items={items}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onOpen={onOpenCapture}
            onToggleInReport={onToggleInReport}
            emptyText="No images match this filter."
          />
        </div>
      </div>

      {/* RIGHT: curation + processing tools */}
      <aside className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto pr-0.5">
        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
          <p className="text-xs font-semibold text-[var(--graphite-text-header)]">Report set</p>
          <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">
            {inReport.size} image{inReport.size === 1 ? "" : "s"} marked for the report. Order &amp;
            generate in <span className="font-semibold text-[var(--graphite-text-body)]">Report Builder</span>.
          </p>
          <button
            type="button"
            onClick={() => onAddToReport(selectedIds)}
            disabled={!selectedIds.length}
            title={selectedIds.length ? "" : "Select images (✓ corner) first"}
            className="mt-2 rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)] disabled:opacity-40"
          >
            {selectedIds.length
              ? `Add ${selectedIds.length} selected to report`
              : "Add selected to report"}
          </button>
          <div className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2">
            <p className="text-[11px] text-[var(--graphite-muted)]">
              {pairedCount} thermal/visual pair{pairedCount === 1 ? "" : "s"} linked.
            </p>
            <button
              type="button"
              onClick={autoPair}
              disabled={pairing}
              className="mt-1 rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)] disabled:opacity-40"
            >
              {pairing ? "Pairing…" : "Auto-pair thermal + visual"}
            </button>
            {pairNote ? <span className="ml-2 text-[11px] text-[var(--graphite-muted)]">{pairNote}</span> : null}
          </div>
        </div>
        <ThermalProcessPanel sessionId={sessionId} allIds={allIds} selectedIds={selectedIds} />
        <ThermalInspectionProfiles sessionId={sessionId} targetIds={targetIds} />
        <ThermalBatchTunePanel captureIds={targetIds} />
      </aside>
      {showPicker ? <ThermalSlateDropPicker sessionId={sessionId} onClose={() => setShowPicker(false)} /> : null}
    </div>
  );
}
