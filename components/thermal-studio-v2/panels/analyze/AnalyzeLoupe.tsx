"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { fmtTemp } from "@/lib/thermal/probe-palettes";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";

const ZOOM_FACTOR = 8;
const MIN_SIZE = 100;
const MAX_SIZE = 320;

/**
 * Floating draggable/collapsible/resizable loupe (doc §1, Tab 2): grab the
 * title bar to move, − to collapse to a pill, ⤢ to resize. Draws a cropped,
 * scaled copy of the already-painted main canvas so it's always in sync with
 * the live palette/span — no separate recompute.
 */
export function AnalyzeLoupe({
  sourceCanvasRef,
  hover,
  unit = "C",
}: {
  sourceCanvasRef: RefObject<HTMLCanvasElement | null>;
  hover: HoverInfo;
  unit?: "C" | "F";
}) {
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [size, setSize] = useState(160);
  const [collapsed, setCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startSize: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = sourceCanvasRef.current;
    if (!canvas || !source || !hover || collapsed) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const cropPx = size / ZOOM_FACTOR;
    const sx = Math.max(0, Math.min(source.width - cropPx, hover.x - cropPx / 2));
    const sy = Math.max(0, Math.min(source.height - cropPx, hover.y - cropPx / 2));
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, sx, sy, cropPx, cropPx, 0, 0, size, size);

    // Pixel grid (S5.5) — one thermal pixel renders at ZOOM_FACTOR px here, so a
    // faint grid marks true sensor-pixel boundaries; offset by the fractional
    // crop origin so the lines land exactly on them.
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -(sx % 1) * ZOOM_FACTOR; gx <= size; gx += ZOOM_FACTOR) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, size);
    }
    for (let gy = -(sy % 1) * ZOOM_FACTOR; gy <= size; gy += ZOOM_FACTOR) {
      ctx.moveTo(0, gy);
      ctx.lineTo(size, gy);
    }
    ctx.stroke();

    // Crosshair on the cursor pixel + its exact temperature (S5.5).
    const cx = (hover.x + 0.5 - sx) * ZOOM_FACTOR;
    const cy = (hover.y + 0.5 - sy) * ZOOM_FACTOR;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    const label = fmtTemp(hover.tempC, unit);
    ctx.font = "600 11px ui-monospace, monospace";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(size / 2 - tw / 2 - 5, size - 20, tw + 10, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, size / 2 - tw / 2, size - 8);
  }, [hover, size, collapsed, sourceCanvasRef, unit]);

  function startDrag(e: ReactMouseEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, x: pos.x, y: pos.y };
    function onMove(ev: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      setPos({ x: d.x + (ev.clientX - d.startX), y: d.y + (ev.clientY - d.startY) });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startResize(e: ReactMouseEvent) {
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startSize: size };
    function onMove(ev: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      setSize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, r.startSize + (ev.clientX - r.startX))));
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="absolute z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] shadow-lg"
    >
      <div
        onMouseDown={startDrag}
        title="Drag to move the loupe"
        className="flex cursor-move items-center justify-between gap-2 border-b border-[var(--mobile-app-card-border)] px-2 py-1"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Loupe</span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand loupe" : "Collapse loupe to a pill"}
          className="rounded px-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          {collapsed ? "▢" : "−"}
        </button>
      </div>
      {collapsed ? null : (
        <div className="relative" style={{ width: size, height: size }}>
          <canvas ref={canvasRef} className="h-full w-full" style={{ imageRendering: "pixelated" }} />
          {!hover ? (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--graphite-muted)]">
              Hover the image
            </div>
          ) : null}
          <div
            onMouseDown={startResize}
            title="Drag to resize"
            className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize text-[8px] leading-3 text-[var(--graphite-muted)]"
          >
            ⤢
          </div>
        </div>
      )}
    </div>
  );
}
