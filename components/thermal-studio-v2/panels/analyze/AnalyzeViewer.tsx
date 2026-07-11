"use client";

import { useMemo, useRef } from "react";
import { histogramEqualize, type Isotherm } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { AnalyzeCanvas, type HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import { AnalyzeLegend } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeLegend";
import { AnalyzeLoupe } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeLoupe";
import type { ThermalV2Spot, ThermalV2Tool } from "@/components/thermal-studio-v2/types";

/** Center hero — presentational: canvas + legend + loupe. All state is owned by AnalyzePanel. */
export function AnalyzeViewer({
  grid,
  loading,
  error,
  palette,
  unit,
  span,
  onSpanChange,
  isotherm,
  localContrast,
  displayPalette,
  displaySpan,
  hover,
  onHoverChange,
  spots,
  tool,
  areaShape,
  selectedId,
  referenceId,
  onSelect,
  onCreateSpot,
  onCommitSpots,
}: {
  grid: ThermalV2Grid | null;
  loading: boolean;
  error: string | null;
  palette: string;
  unit: "C" | "F";
  span: { lo: number; hi: number } | null;
  onSpanChange: (next: { lo: number; hi: number }) => void;
  isotherm?: Isotherm | null;
  /** S5.6 Local contrast (display only). */
  localContrast?: boolean;
  /** S5.6 A/B flicker: the currently-shown snapshot's palette/span (falls back to the live ones when no flicker is active). */
  displayPalette?: string;
  displaySpan?: { lo: number; hi: number } | null;
  hover: HoverInfo;
  onHoverChange: (h: HoverInfo) => void;
  spots: ThermalV2Spot[];
  tool: ThermalV2Tool;
  areaShape?: "box" | "circle";
  selectedId: string | null;
  referenceId: string | null;
  onSelect: (id: string | null) => void;
  onCreateSpot: (spot: ThermalV2Spot) => void;
  onCommitSpots: (next: ThermalV2Spot[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintPalette = displayPalette ?? palette;
  const paintSpan = displaySpan ?? span;

  const displayTemps = useMemo(() => {
    if (!localContrast || !grid || !paintSpan) return null;
    return histogramEqualize(grid.temps, paintSpan.lo, paintSpan.hi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localContrast, grid, paintSpan?.lo, paintSpan?.hi]);

  if (!grid && !loading && !error) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">
        Select an image from the working set or filmstrip
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full">
      <div className="min-h-0 min-w-0 flex-1">
        <AnalyzeCanvas
          grid={grid}
          loading={loading}
          error={error}
          palette={paintPalette}
          lo={paintSpan?.lo ?? 0}
          hi={paintSpan?.hi ?? 1}
          isotherm={isotherm}
          displayTemps={displayTemps}
          onHover={onHoverChange}
          canvasRef={canvasRef}
          spots={spots}
          tool={tool}
          areaShape={areaShape}
          selectedId={selectedId}
          referenceId={referenceId}
          onSelect={onSelect}
          onCreateSpot={onCreateSpot}
          onCommitSpots={onCommitSpots}
        />
      </div>
      {grid && span ? (
        <AnalyzeLegend
          palette={palette}
          lo={span.lo}
          hi={span.hi}
          gridMin={grid.minC}
          gridMax={grid.maxC}
          unit={unit}
          onChange={onSpanChange}
        />
      ) : null}
      {grid ? <AnalyzeLoupe sourceCanvasRef={canvasRef} hover={hover} unit={unit} /> : null}
    </div>
  );
}
