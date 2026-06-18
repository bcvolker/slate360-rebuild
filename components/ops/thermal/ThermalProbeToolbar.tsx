"use client";

import { PALETTE_NAMES, type MarkerShape, type Unit } from "@/lib/thermal/probe-palettes";
import { Toggle } from "@/components/ops/thermal/ThermalProbeMarkers";

/** Top toolbar for the probe: palette, marker shape, unit, layer toggles, spot clears. */
export function ThermalProbeToolbar({
  title,
  palette,
  setPalette,
  shape,
  setShape,
  unit,
  setUnit,
  showLabels,
  setShowLabels,
  showMax,
  setShowMax,
  showMin,
  setShowMin,
  hasAnomalies,
  showFindings,
  setShowFindings,
  importedCount,
  onClearBaked,
  spotCount,
  onClearSpots,
}: {
  title?: string;
  palette: string;
  setPalette: (v: string) => void;
  shape: MarkerShape;
  setShape: (v: MarkerShape) => void;
  unit: Unit;
  setUnit: (fn: (u: Unit) => Unit) => void;
  showLabels: boolean;
  setShowLabels: (fn: (v: boolean) => boolean) => void;
  showMax: boolean;
  setShowMax: (fn: (v: boolean) => boolean) => void;
  showMin: boolean;
  setShowMin: (fn: (v: boolean) => boolean) => void;
  hasAnomalies: boolean;
  showFindings: boolean;
  setShowFindings: (fn: (v: boolean) => boolean) => void;
  importedCount: number;
  onClearBaked: () => void;
  spotCount: number;
  onClearSpots: () => void;
}) {
  const clearBtn =
    "rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]";
  const selectCls =
    "rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-[var(--graphite-text-body)]";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{title ?? "Thermal probe"}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <select value={palette} onChange={(e) => setPalette(e.target.value)} className={selectCls} aria-label="Color palette">
          {PALETTE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={shape} onChange={(e) => setShape(e.target.value as MarkerShape)} className={selectCls} aria-label="Marker shape">
          <option value="circle">Circle target</option>
          <option value="crosshair">Crosshair</option>
          <option value="box">Box</option>
        </select>
        <Toggle on={unit === "F"} onClick={() => setUnit((u) => (u === "F" ? "C" : "F"))}>°{unit}</Toggle>
        <Toggle on={showLabels} onClick={() => setShowLabels((v) => !v)}>Labels</Toggle>
        <Toggle on={showMax} onClick={() => setShowMax((v) => !v)}>Max</Toggle>
        <Toggle on={showMin} onClick={() => setShowMin((v) => !v)}>Min</Toggle>
        {hasAnomalies ? (
          <Toggle on={showFindings} onClick={() => setShowFindings((v) => !v)}>Findings</Toggle>
        ) : null}
        {importedCount ? (
          <button type="button" onClick={onClearBaked} className={clearBtn}>
            Clear baked ({importedCount})
          </button>
        ) : null}
        {spotCount ? (
          <button type="button" onClick={onClearSpots} className={clearBtn}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
