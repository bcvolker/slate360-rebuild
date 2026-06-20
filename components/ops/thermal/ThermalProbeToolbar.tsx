"use client";

import { PALETTE_NAMES, type Unit } from "@/lib/thermal/probe-palettes";
import { Toggle } from "@/components/ops/thermal/ThermalProbeMarkers";

export type ProbeTool = "crosshair" | "crosshair-circle" | "area";

/** Top toolbar for the probe: palette, target tool, undo/redo, unit, layers, clears. */
export function ThermalProbeToolbar({
  title,
  palette,
  setPalette,
  tool,
  setTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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
  showLoupe,
  setShowLoupe,
  importedCount,
  onClearBaked,
  spotCount,
  onClearSpots,
}: {
  title?: string;
  palette: string;
  setPalette: (v: string) => void;
  tool: ProbeTool;
  setTool: (v: ProbeTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  showLoupe: boolean;
  setShowLoupe: (fn: (v: boolean) => boolean) => void;
  importedCount: number;
  onClearBaked: () => void;
  spotCount: number;
  onClearSpots: () => void;
}) {
  const clearBtn =
    "rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]";
  const selectCls =
    "rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] px-2 py-1 text-[var(--graphite-text-body)] [color-scheme:dark]";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{title ?? "Thermal probe"}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <select value={palette} onChange={(e) => setPalette(e.target.value)} className={selectCls} aria-label="Color palette">
          {PALETTE_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={tool} onChange={(e) => setTool(e.target.value as ProbeTool)} className={selectCls} aria-label="Target tool">
          <option value="crosshair">＋ Crosshair</option>
          <option value="crosshair-circle">⌖ Crosshair + ring</option>
          <option value="area">▢ Area (avg)</option>
        </select>
        <button type="button" onClick={onUndo} disabled={!canUndo} className={`${clearBtn} disabled:opacity-40`} title="Undo (Ctrl+Z)">↶</button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className={`${clearBtn} disabled:opacity-40`} title="Redo (Ctrl+Shift+Z)">↷</button>
        <Toggle on={unit === "F"} onClick={() => setUnit((u) => (u === "F" ? "C" : "F"))}>°{unit}</Toggle>
        <Toggle on={showLabels} onClick={() => setShowLabels((v) => !v)}>Labels</Toggle>
        <Toggle on={showMax} onClick={() => setShowMax((v) => !v)}>Max</Toggle>
        <Toggle on={showMin} onClick={() => setShowMin((v) => !v)}>Min</Toggle>
        <Toggle on={showLoupe} onClick={() => setShowLoupe((v) => !v)}>Loupe</Toggle>
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
