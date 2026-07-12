"use client";

import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { renderHeatmap, fmtTemp } from "@/lib/thermal/probe-palettes";
import { useComparePair } from "@/components/thermal-studio-v2/lib/useComparePair";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;

function CompareSide({
  label,
  grid,
  loading,
  error,
  palette,
  span,
  zoom,
  pan,
  unit,
}: {
  label: string;
  grid: ReturnType<typeof useComparePair>["a"]["grid"];
  loading: boolean;
  error: string | null;
  palette: string;
  span: { lo: number; hi: number } | null;
  zoom: number;
  pan: { x: number; y: number };
  unit: "C" | "F";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverTemp, setHoverTemp] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid || !span) return;
    canvas.width = grid.width;
    canvas.height = grid.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderHeatmap(ctx, grid.temps, grid.width, grid.height, palette, span.lo, span.hi, null);
  }, [grid, palette, span]);

  // Audit remediation Batch 3: this used to map the mouse straight against
  // the canvas element's raw bounding box, ignoring that `object-fit:
  // contain` letterboxes a square grid inside a non-square box — hover was
  // wrong (or silently accepted a letterbox bar as an edge pixel) whenever
  // the container's aspect ratio didn't match the grid's, exactly the bug
  // useCanvasStage.ts's `canvasBox`/`fitScale` math already fixed for the
  // single-image viewer. Same math, ported here since Compare uses its own
  // plain canvas rather than that stage hook.
  function handleMouseMove(e: MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const fitScale = Math.min(rect.width / grid.width, rect.height / grid.height);
    const fitW = grid.width * fitScale;
    const fitH = grid.height * fitScale;
    const offsetX = (rect.width - fitW) / 2;
    const offsetY = (rect.height - fitH) / 2;
    const localX = e.clientX - rect.left - offsetX;
    const localY = e.clientY - rect.top - offsetY;
    if (localX < 0 || localY < 0 || localX > fitW || localY > fitH) {
      setHoverTemp(null);
      return;
    }
    const ix = Math.min(grid.width - 1, Math.floor(localX / fitScale));
    const iy = Math.min(grid.height - 1, Math.floor(localY / fitScale));
    setHoverTemp(grid.temps[iy * grid.width + ix]);
  }

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden border border-[var(--mobile-app-card-border)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--mobile-app-card-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
        <span>{label}</span>
        {hoverTemp != null ? <span className="tabular-nums text-[var(--graphite-text-header)]">{fmtTemp(hoverTemp, unit)}</span> : null}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTemp(null)}>
        {loading ? <span className="text-xs text-[var(--graphite-muted)]">Loading grid…</span> : null}
        {error ? <span className="max-w-xs text-center text-xs text-[#fca5a5]">{error}</span> : null}
        {grid ? (
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              imageRendering: "pixelated",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * S6.5 Compare view (doc §S6.5, P4 core): two read-only canvases with shared
 * pan/zoom (no per-canvas measurement editing — this is a viewing mode) and
 * an optional span-lock so both sides render on the same comparable range.
 */
export function AnalyzeCompareView({
  captureA,
  captureB,
  palette,
  unit,
  spanLock,
}: {
  captureA: ThermalV2Capture | null;
  captureB: ThermalV2Capture | null;
  palette: string;
  unit: "C" | "F";
  spanLock: boolean;
}) {
  const { a, b } = useComparePair(captureA, captureB);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [captureA?.id, captureB?.id]);

  const spanA = a.grid ? { lo: a.grid.minC, hi: a.grid.maxC } : null;
  const spanB = b.grid ? { lo: b.grid.minC, hi: b.grid.maxC } : null;
  const lockedSpan =
    spanLock && a.grid && b.grid ? { lo: Math.min(a.grid.minC, b.grid.minC), hi: Math.max(a.grid.maxC, b.grid.maxC) } : null;

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function handleMouseDown(e: MouseEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setPan({ x: drag.panX + (e.clientX - drag.startX), y: drag.panY + (e.clientY - drag.startY) });
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      className="flex h-full w-full cursor-grab gap-2 p-2 active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      data-testid="analyze-compare-view"
    >
      <CompareSide label={captureA?.filename ?? "—"} grid={a.grid} loading={a.loading} error={a.error} palette={palette} span={lockedSpan ?? spanA} zoom={zoom} pan={pan} unit={unit} />
      <CompareSide label={captureB?.filename ?? "—"} grid={b.grid} loading={b.loading} error={b.error} palette={palette} span={lockedSpan ?? spanB} zoom={zoom} pan={pan} unit={unit} />
    </div>
  );
}
