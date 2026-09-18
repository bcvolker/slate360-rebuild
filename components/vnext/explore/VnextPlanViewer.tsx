"use client";

import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { VnextPlanSourceData } from "@/lib/vnext/explore-types";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

/**
 * No existing plan viewer is read-only — the app's PlanViewer components are all
 * pin-authoring surfaces coupled to rasterization jobs. This is a bare, purpose-built
 * pan/zoom image viewer: no pin CRUD, no job polling, just the sheet image.
 */
export default function VnextPlanViewer({ data }: { data: VnextPlanSourceData }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mediaError, setMediaError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const retry = useCallback(() => {
    setMediaError(false);
    setRetryAttempt((n) => n + 1);
  }, []);

  if (mediaError) {
    return <VnextViewerMediaError onRetry={retry} />;
  }

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const zoomBy = useCallback((factor: number) => {
    setScale((prev) => clampScale(prev * factor));
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    (event.target as Element).setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--vnext-surface)]">
      <div
        className="h-full w-full touch-none select-none overflow-hidden"
        style={{ cursor: scale > 1 ? "grab" : "default" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={reset}
        data-vnext-plan-canvas="true"
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 120ms ease-out",
          }}
        >
          {/* Plan sheet raster — intentionally a plain img, not a canvas/tile engine. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={retryAttempt > 0 ? `${data.imageUrl}?retry=${retryAttempt}` : data.imageUrl}
            alt={data.sheetName}
            className="max-h-full max-w-full object-contain"
            draggable={false}
            onError={() => setMediaError(true)}
          />
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1.5" role="group" aria-label="Zoom controls">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          disabled={scale <= MIN_SCALE}
          className="flex h-11 w-11 items-center justify-center border border-[var(--vnext-line)] bg-[var(--vnext-surface)] text-[var(--vnext-ink)] disabled:opacity-40"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          disabled={scale >= MAX_SCALE}
          className="flex h-11 w-11 items-center justify-center border border-[var(--vnext-line)] bg-[var(--vnext-surface)] text-[var(--vnext-ink)] disabled:opacity-40"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={scale === 1 && offset.x === 0 && offset.y === 0}
          className="flex h-11 w-11 items-center justify-center border border-[var(--vnext-line)] bg-[var(--vnext-surface)] text-[var(--vnext-ink)] disabled:opacity-40"
          aria-label="Reset view"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
