"use client";

import { useEffect, useState, type MouseEvent, type RefObject } from "react";
import { renderHeatmap, newSpotId, type Isotherm } from "@/lib/thermal/probe-palettes";
import { SpotOverlay } from "@/components/thermal-studio-v2/panels/analyze/SpotOverlay";
import { useCanvasStage } from "@/components/thermal-studio-v2/lib/useCanvasStage";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Spot, ThermalV2Tool } from "@/components/thermal-studio-v2/types";

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
  displayTemps,
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
  isotherm?: Isotherm | null;
  /** S5.6 Local contrast: histogram-equalized paint source (display only) — falls back to grid.temps. */
  displayTemps?: Float32Array | null;
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

  // S5.6 polygon tool: click accumulates draft vertices; Enter/double-click
  // commits (≥3 points), Escape cancels. Local to this component — nothing
  // is created (and nothing autosaves) until the draft is committed.
  const [polygonDraft, setPolygonDraft] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    setPolygonDraft([]);
  }, [tool]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (tool !== "polygon" || polygonDraft.length === 0) return;
      if (e.key === "Escape") {
        setPolygonDraft([]);
      } else if (e.key === "Enter" && polygonDraft.length >= 3) {
        commitPolygon();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, polygonDraft]);

  function commitPolygon() {
    if (polygonDraft.length < 3) return;
    const cx = polygonDraft.reduce((a, p) => a + p.x, 0) / polygonDraft.length;
    const cy = polygonDraft.reduce((a, p) => a + p.y, 0) / polygonDraft.length;
    const id = newSpotId();
    onCreateSpot({ id, kind: "polygon", x: cx, y: cy, points: polygonDraft.slice(0, 64) });
    onSelect(id);
    setPolygonDraft([]);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    canvas.width = grid.width;
    canvas.height = grid.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderHeatmap(ctx, displayTemps ?? grid.temps, grid.width, grid.height, palette, lo, hi, isotherm ?? null);
  }, [grid, palette, lo, hi, isotherm, displayTemps, canvasRef]);

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
    if (tool === "polygon") {
      const coords = toImageCoords(e.clientX, e.clientY);
      if (coords?.inBounds) setPolygonDraft((prev) => [...prev, { x: coords.imgX, y: coords.imgY }]);
      return;
    }
    if (tool !== "move") {
      const coords = toImageCoords(e.clientX, e.clientY);
      if (coords?.inBounds) createDefaultSpot(coords.imgX, coords.imgY);
      return;
    }
    onSelect(null);
    stage.startPan(e);
  }

  function handleStageDoubleClick() {
    if (tool === "polygon") commitPolygon();
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
      title={
        tool === "move"
          ? "Scroll to zoom, drag to pan"
          : tool === "polygon"
            ? "Click each corner, then Enter or double-click to close the shape (Esc cancels)"
            : `Click to place a ${tool}`
      }
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
          onDoubleClick={handleStageDoubleClick}
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
              {polygonDraft.length > 0 ? (
                <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    points={polygonDraft.map((p) => `${(p.x / grid.width) * 100},${(p.y / grid.height) * 100}`).join(" ")}
                    fill="none"
                    stroke="var(--graphite-primary)"
                    strokeWidth={0.4}
                    strokeDasharray="2,1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {polygonDraft.map((p, i) => (
                    <circle key={i} cx={(p.x / grid.width) * 100} cy={(p.y / grid.height) * 100} r={0.6} fill="var(--graphite-primary)" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
