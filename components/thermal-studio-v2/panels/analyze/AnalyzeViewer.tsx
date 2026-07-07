"use client";

import { useRef } from "react";
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
  hover,
  onHoverChange,
  spots,
  tool,
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
  hover: HoverInfo;
  onHoverChange: (h: HoverInfo) => void;
  spots: ThermalV2Spot[];
  tool: ThermalV2Tool;
  selectedId: string | null;
  referenceId: string | null;
  onSelect: (id: string | null) => void;
  onCreateSpot: (spot: ThermalV2Spot) => void;
  onCommitSpots: (next: ThermalV2Spot[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
          palette={palette}
          lo={span?.lo ?? 0}
          hi={span?.hi ?? 1}
          onHover={onHoverChange}
          canvasRef={canvasRef}
          spots={spots}
          tool={tool}
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
      {grid ? <AnalyzeLoupe sourceCanvasRef={canvasRef} hover={hover} /> : null}
    </div>
  );
}
