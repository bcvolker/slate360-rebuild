"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
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
}: {
  sourceCanvasRef: RefObject<HTMLCanvasElement | null>;
  hover: HoverInfo;
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
  }, [hover, size, collapsed, sourceCanvasRef]);

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
