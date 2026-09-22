"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { VnextPlanSourceData } from "@/lib/vnext/explore-types";
import type { VnextPlanMarker } from "@/lib/vnext/items/item-types";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

/**
 * Read-only pan/zoom sheet. A selected item may place one marker at a known
 * x/y percent. There is no pin create, drag, or delete.
 */
export default function VnextPlanViewer({
  data,
  marker = null,
}: {
  data: VnextPlanSourceData;
  marker?: VnextPlanMarker | null;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mediaError, setMediaError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [fitted, setFitted] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const fitImage = useCallback(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img) return;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (!naturalWidth || !naturalHeight || !frame.clientWidth || !frame.clientHeight) return;
    const next = Math.min(frame.clientWidth / naturalWidth, frame.clientHeight / naturalHeight);
    setFitted({ w: naturalWidth * next, h: naturalHeight * next });
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !imageReady) return;
    fitImage();
    const observer = new ResizeObserver(() => fitImage());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [fitImage, imageReady]);

  const retry = useCallback(() => {
    setMediaError(false);
    setImageReady(false);
    setFitted(null);
    setRetryAttempt((n) => n + 1);
  }, []);

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const zoomBy = useCallback((factor: number) => {
    setScale((prev) => clampScale(prev * factor));
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Every hook above must run on every render regardless of mediaError — this early return only
  // skips which JSX gets built, never how many hooks get called (a conditional return placed
  // BEFORE a hook is the exact "rendered fewer hooks than expected" bug this avoids).
  if (mediaError) {
    return <VnextViewerMediaError onRetry={retry} />;
  }

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
          ref={frameRef}
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 120ms ease-out",
          }}
        >
          {/* Plan sheet raster — intentionally a plain img, not a canvas/tile engine. */}
          <div
            className="relative max-h-full max-w-full"
            style={fitted ? { width: fitted.w, height: fitted.h } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={retryAttempt > 0 ? `${data.imageUrl}?retry=${retryAttempt}` : data.imageUrl}
              alt={data.sheetName}
              className={fitted ? "h-full w-full object-contain" : "block max-h-full max-w-full object-contain"}
              draggable={false}
              onLoad={() => {
                setImageReady(true);
                fitImage();
              }}
              onError={() => setMediaError(true)}
            />
            {marker && fitted ? (
              <span
                data-vnext-plan-marker="true"
                data-x-pct={String(marker.xPct)}
                data-y-pct={String(marker.yPct)}
                role="img"
                aria-label={marker.label}
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-[var(--vnext-accent)] bg-[var(--vnext-surface)]"
                style={{ left: `${marker.xPct}%`, top: `${marker.yPct}%` }}
              />
            ) : null}
          </div>
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
