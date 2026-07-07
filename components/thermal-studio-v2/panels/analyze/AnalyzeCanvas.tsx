"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject, type WheelEvent } from "react";
import { renderHeatmap } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";

export type HoverInfo = { x: number; y: number; tempC: number } | null;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;

/**
 * Center hero (doc §1, Tab 2): canvas paint of the temperature grid, zoom/pan,
 * hover temp readout. Repaint on grid/palette/span change only (<50ms, no
 * debounce) — zoom/pan are pure CSS transforms so they never trigger a repaint.
 */
export function AnalyzeCanvas({
  grid,
  loading,
  error,
  palette,
  lo,
  hi,
  onHover,
  canvasRef,
}: {
  grid: ThermalV2Grid | null;
  loading: boolean;
  error: string | null;
  palette: string;
  lo: number;
  hi: number;
  onHover: (info: HoverInfo) => void;
  /** Shared with the loupe so it can drawImage() a cropped region of the same painted canvas. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

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
    renderHeatmap(ctx, grid.temps, grid.width, grid.height, palette, lo, hi);
  }, [grid, palette, lo, hi]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = wrapRef.current;
      if (!wrap || !grid) return null;
      const rect = wrap.getBoundingClientRect();
      const cx = rect.width / 2 + pan.x;
      const cy = rect.height / 2 + pan.y;
      const scale = Math.min(rect.width / grid.width, rect.height / grid.height) * zoom;
      const imgX = Math.floor((clientX - rect.left - cx) / scale + grid.width / 2);
      const imgY = Math.floor((clientY - rect.top - cy) / scale + grid.height / 2);
      if (imgX < 0 || imgY < 0 || imgX >= grid.width || imgY >= grid.height) return null;
      return { imgX, imgY, scale, rect, cx, cy };
    },
    [grid, pan, zoom],
  );

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function handleMouseDown(e: MouseEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handleMouseMove(e: MouseEvent) {
    if (dragRef.current) {
      const d = dragRef.current;
      setPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) });
      return;
    }
    if (!grid) return;
    const coords = toImageCoords(e.clientX, e.clientY);
    if (!coords) {
      onHover(null);
      return;
    }
    const tempC = grid.temps[coords.imgY * grid.width + coords.imgX];
    onHover({ x: coords.imgX, y: coords.imgY, tempC });
  }

  function handleMouseUp() {
    dragRef.current = null;
  }

  function handleMouseLeave() {
    dragRef.current = null;
    onHover(null);
  }

  return (
    <div
      ref={wrapRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title="Scroll to zoom, drag to pan"
      className="relative flex h-full w-full cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing"
    >
      {loading ? <span className="text-xs text-[var(--graphite-muted)]">Loading grid…</span> : null}
      {error ? <span className="max-w-xs text-center text-xs text-[#fca5a5]">{error}</span> : null}
      {grid ? (
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            maxWidth: "100%",
            maxHeight: "100%",
            imageRendering: "pixelated",
          }}
          className="pointer-events-none"
        />
      ) : null}
    </div>
  );
}
