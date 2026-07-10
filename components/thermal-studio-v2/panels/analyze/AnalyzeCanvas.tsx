"use client";

import { useEffect, type MouseEvent, type RefObject } from "react";
import { renderHeatmap, newSpotId } from "@/lib/thermal/probe-palettes";
import { SpotOverlay } from "@/components/thermal-studio-v2/panels/analyze/SpotOverlay";
import { useCanvasStage } from "@/components/thermal-studio-v2/lib/useCanvasStage";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Isotherm, ThermalV2Spot, ThermalV2Tool } from "@/components/thermal-studio-v2/types";

export type HoverInfo = { x: number; y: number; tempC: number } | null;

/**
 * Center hero (doc §1, Tab 2 + §0.1 editability law): canvas paint + hover + the
 * measurement lifecycle. Pan/zoom and the drag/resize/line-end gesture engine live
 * in useCanvasStage; this component owns the paint effect, spot creation, and the
 * overlay render.
 */
export function AnalyzeCanvas({
  grid,
  loading,
  error,
  palette,
  lo,
  hi,
  isotherm,
  onHover,
  canvasRef,
  spots,
  tool,
  areaShape = "box",
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
  lo: number;
  hi: number;
  isotherm?: ThermalV2Isotherm;
  onHover: (info: HoverInfo) => void;
  /** Shared with the loupe so it can drawImage() a cropped region of the same painted canvas. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  spots: ThermalV2Spot[];
  tool: ThermalV2Tool;
  /** Shape used when the Area tool places a new measurement (S5.5). */
  areaShape?: "box" | "circle";
  selectedId: string | null;
  referenceId: string | null;
  onSelect: (id: string | null) => void;
  onCreateSpot: (spot: ThermalV2Spot) => void;
  onCommitSpots: (next: ThermalV2Spot[]) => void;
}) {
  const stage = useCanvasStage({ grid, spots, canvasRef, onCommitSpots });
  const { canvasBox, zoom, pan, visibleSpots, toImageCoords } = stage;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    canvas.width = grid.width;
    canvas.height = grid.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderHeatmap(ctx, grid.temps, grid.width, grid.height, palette, lo, hi, isotherm ?? null);
  }, [grid, palette, lo, hi, isotherm, canvasRef]);

  function createDefaultSpot(imgX: number, imgY: number) {
    if (!grid) return;
    const id = newSpotId();
    const minDim = Math.min(grid.width, grid.height);
    let spot: ThermalV2Spot;
    if (tool === "area") {
      const size = minDim * 0.15;
      spot = { id, kind: "area", areaShape, x: imgX, y: imgY, w: size, h: size };
    } else if (tool === "line") {
      const len = minDim * 0.2;
      spot = { id, kind: "line", x: imgX - len / 2, y: imgY, x2: imgX + len / 2, y2: imgY };
    } else {
      spot = { id, kind: "point", target: "crosshair", x: imgX, y: imgY };
    }
    onCreateSpot(spot);
    onSelect(id);
  }

  function handleStageMouseDown(e: MouseEvent) {
    if (tool !== "move") {
      const coords = toImageCoords(e.clientX, e.clientY);
      if (coords?.inBounds) createDefaultSpot(coords.imgX, coords.imgY);
      return;
    }
    onSelect(null);
    stage.startPan(e);
  }

  function handleMouseMove(e: MouseEvent) {
    if (stage.gestureActive() || !grid) return;
    const coords = toImageCoords(e.clientX, e.clientY);
    if (!coords?.inBounds) {
      onHover(null);
      return;
    }
    const ix = Math.floor(coords.imgX);
    const iy = Math.floor(coords.imgY);
    onHover({ x: ix, y: iy, tempC: grid.temps[iy * grid.width + ix] });
  }

  return (
    <div
      title={tool === "move" ? "Scroll to zoom, drag to pan" : `Click to place a ${tool}`}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${
        tool === "move" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
      }`}
    >
      {loading ? <span className="text-xs text-[var(--graphite-muted)]">Loading grid…</span> : null}
      {error ? <span className="max-w-xs text-center text-xs text-[#fca5a5]">{error}</span> : null}
      {grid ? (
        <div
          ref={stage.stageRef}
          onWheel={stage.handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => onHover(null)}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          className="relative flex h-full w-full items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated", display: "block" }}
          />
          {canvasBox.width > 0 ? (
            <div
              className="pointer-events-none absolute"
              style={{ left: canvasBox.left, top: canvasBox.top, width: canvasBox.width, height: canvasBox.height }}
            >
              {visibleSpots.map((spot, i) => (
                <div key={spot.id} className="pointer-events-auto absolute inset-0">
                  <SpotOverlay
                    spot={spot}
                    index={i}
                    gridWidth={grid.width}
                    gridHeight={grid.height}
                    selected={spot.id === selectedId}
                    isReference={spot.id === referenceId}
                    onSelect={() => onSelect(spot.id)}
                    onDelete={() => onCommitSpots(spots.filter((s) => s.id !== spot.id))}
                    onDragStart={() => tool === "move" && stage.startSpotDrag(spot.id)}
                    onResizeStart={() => tool === "move" && stage.startResize(spot.id)}
                    onLineEndStart={(_e, which) => tool === "move" && stage.startLineEnd(spot.id, which)}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
