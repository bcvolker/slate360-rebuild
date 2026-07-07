"use client";

import { useEffect, useRef, useState } from "react";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { AnalyzeCanvas, type HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import { AnalyzeLegend } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeLegend";
import { AnalyzeLoupe } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeLoupe";

/** Center hero orchestrator: owns the grid fetch + palette/unit/span state for the active image. */
export function AnalyzeViewer({
  captureId,
  palette,
  unit,
  onHoverChange,
}: {
  captureId: string | null;
  palette: string;
  unit: "C" | "F";
  onHoverChange: (h: HoverInfo) => void;
}) {
  const [grid, setGrid] = useState<ThermalV2Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [span, setSpan] = useState<{ lo: number; hi: number } | null>(null);
  const [hover, setHover] = useState<HoverInfo>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setGrid(null);
    setSpan(null);
    setError(null);
    if (!captureId) return;
    setLoading(true);
    let cancelled = false;
    void fetchThermalGrid(captureId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setGrid(result.grid);
      setSpan({ lo: result.grid.minC, hi: result.grid.maxC });
    });
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  function handleHover(h: HoverInfo) {
    setHover(h);
    onHoverChange(h);
  }

  if (!captureId) {
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
          onHover={handleHover}
          canvasRef={canvasRef}
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
          onChange={setSpan}
        />
      ) : null}
      {grid ? <AnalyzeLoupe sourceCanvasRef={canvasRef} hover={hover} /> : null}
    </div>
  );
}
