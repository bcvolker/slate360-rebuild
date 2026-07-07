"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject, type WheelEvent } from "react";
import { renderHeatmap, newSpotId } from "@/lib/thermal/probe-palettes";
import { SpotOverlay } from "@/components/thermal-studio-v2/panels/analyze/SpotOverlay";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Isotherm, ThermalV2Spot, ThermalV2Tool } from "@/components/thermal-studio-v2/types";

export type HoverInfo = { x: number; y: number; tempC: number } | null;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;

type Gesture =
  | { type: "pan"; startX: number; startY: number; panX: number; panY: number }
  | { type: "drag"; id: string; origX: number; origY: number; origX2?: number; origY2?: number }
  | { type: "resize"; id: string }
  | { type: "line-end"; id: string; which: "start" | "end" };

/**
 * Center hero (doc §1, Tab 2 + §0.1 editability law): canvas paint + zoom/pan/
 * hover (S3) plus the measurement lifecycle (S4). The canvas aspect-fits itself
 * via CSS (browser does the fit math); a ResizeObserver on the canvas reads
 * back its rendered box so the spot overlay can match it exactly — no manual
 * fit-scale computation, which is what actually broke this in an early draft.
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
  selectedId: string | null;
  referenceId: string | null;
  onSelect: (id: string | null) => void;
  onCreateSpot: (spot: ThermalV2Spot) => void;
  onCommitSpots: (next: ThermalV2Spot[]) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [canvasBox, setCanvasBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const gestureRef = useRef<Gesture | null>(null);
  const [draftSpots, setDraftSpots] = useState<ThermalV2Spot[] | null>(null);

  const visibleSpots = draftSpots ?? spots;

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [grid?.width, grid?.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    canvas.width = grid.width;
    canvas.height = grid.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderHeatmap(ctx, grid.temps, grid.width, grid.height, palette, lo, hi, isotherm ?? null);
  }, [grid, palette, lo, hi, isotherm, canvasRef]);

  // Track the canvas's OWN rendered box (browser already aspect-fit it via CSS) so
  // the overlay div can be positioned to match it pixel-for-pixel — no fit-scale math.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    function measure() {
      const canvasEl = canvasRef.current;
      const stageEl = stageRef.current;
      if (!canvasEl || !stageEl || !grid) return;
      // canvas is CSS-sized to 100%/100% of stage with object-fit:contain, so its
      // own box IS the stage's box — the actual painted picture is a letterboxed
      // rect inside it, computed here (no reliance on canvas auto-sizing to fit).
      const canvasRect = canvasEl.getBoundingClientRect();
      const stageRect = stageEl.getBoundingClientRect();
      const fitScale = canvasRect.width > 0 ? Math.min(canvasRect.width / grid.width, canvasRect.height / grid.height) : 0;
      const fitW = grid.width * fitScale;
      const fitH = grid.height * fitScale;
      setCanvasBox({
        left: (canvasRect.left - stageRect.left + (canvasRect.width - fitW) / 2) / zoom,
        top: (canvasRect.top - stageRect.top + (canvasRect.height - fitH) / 2) / zoom,
        width: fitW / zoom,
        height: fitH / zoom,
      });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, zoom]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage || !grid || canvasBox.width === 0) return null;
      const stageRect = stage.getBoundingClientRect();
      const localX = (clientX - stageRect.left) / zoom - canvasBox.left;
      const localY = (clientY - stageRect.top) / zoom - canvasBox.top;
      const imgX = (localX / canvasBox.width) * grid.width;
      const imgY = (localY / canvasBox.height) * grid.height;
      return { imgX, imgY, inBounds: imgX >= 0 && imgY >= 0 && imgX <= grid.width && imgY <= grid.height };
    },
    [grid, canvasBox, zoom],
  );

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function createDefaultSpot(imgX: number, imgY: number) {
    if (!grid) return;
    const id = newSpotId();
    const minDim = Math.min(grid.width, grid.height);
    let spot: ThermalV2Spot;
    if (tool === "area") {
      const size = minDim * 0.15;
      spot = { id, kind: "area", areaShape: "box", x: imgX, y: imgY, w: size, h: size };
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
    gestureRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function startSpotDrag(id: string) {
    if (tool !== "move") return;
    const spot = spots.find((s) => s.id === id);
    if (!spot) return;
    gestureRef.current = { type: "drag", id, origX: spot.x, origY: spot.y, origX2: spot.x2, origY2: spot.y2 };
    setDraftSpots(spots);
  }

  function startResize(id: string) {
    if (tool !== "move") return;
    gestureRef.current = { type: "resize", id };
    setDraftSpots(spots);
  }

  function startLineEnd(id: string, which: "start" | "end") {
    if (tool !== "move") return;
    gestureRef.current = { type: "line-end", id, which };
    setDraftSpots(spots);
  }

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      const g = gestureRef.current;
      if (!g || !grid) return;
      if (g.type === "pan") {
        setPan({ x: g.panX + (e.clientX - g.startX), y: g.panY + (e.clientY - g.startY) });
        return;
      }
      const coords = toImageCoords(e.clientX, e.clientY);
      if (!coords) return;
      setDraftSpots((prev) => {
        const base = prev ?? spots;
        return base.map((s) => {
          if (s.id !== g.id) return s;
          if (g.type === "drag") {
            const dx = coords.imgX - g.origX;
            const dy = coords.imgY - g.origY;
            if (s.kind === "line" && s.x2 != null && s.y2 != null) {
              return { ...s, x: g.origX + dx, y: g.origY + dy, x2: (g.origX2 ?? s.x2) + dx, y2: (g.origY2 ?? s.y2) + dy };
            }
            return { ...s, x: coords.imgX, y: coords.imgY };
          }
          if (g.type === "resize") {
            const w = Math.max(4, Math.abs(coords.imgX - s.x) * 2);
            const h = Math.max(4, Math.abs(coords.imgY - s.y) * 2);
            return { ...s, w, h };
          }
          if (g.type === "line-end") {
            return g.which === "start" ? { ...s, x: coords.imgX, y: coords.imgY } : { ...s, x2: coords.imgX, y2: coords.imgY };
          }
          return s;
        });
      });
    }
    function onUp() {
      const g = gestureRef.current;
      gestureRef.current = null;
      if (g && g.type !== "pan" && draftSpots) {
        onCommitSpots(draftSpots);
      }
      setDraftSpots(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, spots, draftSpots, toImageCoords, onCommitSpots]);

  function handleMouseMove(e: MouseEvent) {
    if (gestureRef.current) return;
    if (!grid) return;
    const coords = toImageCoords(e.clientX, e.clientY);
    if (!coords?.inBounds) {
      onHover(null);
      return;
    }
    const ix = Math.floor(coords.imgX);
    const iy = Math.floor(coords.imgY);
    onHover({ x: ix, y: iy, tempC: grid.temps[iy * grid.width + ix] });
  }

  function handleMouseLeave() {
    onHover(null);
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
          ref={stageRef}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
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
                    onDragStart={() => startSpotDrag(spot.id)}
                    onResizeStart={() => startResize(spot.id)}
                    onLineEndStart={(_e, which) => startLineEnd(spot.id, which)}
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
