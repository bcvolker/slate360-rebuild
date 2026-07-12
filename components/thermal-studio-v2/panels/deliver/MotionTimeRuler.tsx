"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { MotionRange } from "@/components/thermal-studio-v2/lib/useMotionState";

/**
 * S8-M Motion's shared "filmstrip of time" (doc D4): a horizontal ruler with
 * one tick per frame, draggable in/out handles marking the render range, and
 * a playhead — click any tick to preview that frame. Range-based (not the
 * old Motion Studio's manual multi-select + reorder list) since both
 * Timelapse and Video Trim are described as contiguous ranges in the doc.
 */
export function MotionTimeRuler({
  frameCount,
  range,
  onRangeChange,
  filenames,
}: {
  frameCount: number;
  range: MotionRange;
  onRangeChange: (next: MotionRange) => void;
  filenames: string[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"in" | "out" | "playhead" | null>(null);
  const lastCount = Math.max(1, frameCount - 1);

  function indexFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * lastCount);
  }

  function startDrag(which: "in" | "out" | "playhead") {
    return (e: ReactMouseEvent) => {
      e.stopPropagation();
      setDragging(which);
      function onMove(ev: globalThis.MouseEvent) {
        const idx = indexFromClientX(ev.clientX);
        if (which === "in") onRangeChange({ ...range, inIdx: Math.min(idx, range.outIdx) });
        else if (which === "out") onRangeChange({ ...range, outIdx: Math.max(idx, range.inIdx) });
        else onRangeChange({ ...range, playheadIdx: Math.max(range.inIdx, Math.min(range.outIdx, idx)) });
      }
      function onUp() {
        setDragging(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };
  }

  function handleTrackClick(e: ReactMouseEvent) {
    if (dragging) return;
    const idx = indexFromClientX(e.clientX);
    onRangeChange({ ...range, playheadIdx: Math.max(range.inIdx, Math.min(range.outIdx, idx)) });
  }

  const pct = (idx: number) => `${(idx / lastCount) * 100}%`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--graphite-muted)]">
        <span className="shrink-0">{range.outIdx - range.inIdx + 1} of {frameCount} frames in range</span>
        <span className="min-w-0 truncate">{filenames[range.playheadIdx] ?? ""}</span>
      </div>
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-8 shrink-0 cursor-pointer rounded-md border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)]"
      >
        {/* selected range band */}
        <div
          className="pointer-events-none absolute inset-y-0 bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)]"
          style={{ left: pct(range.inIdx), right: `calc(100% - ${pct(range.outIdx)})` }}
        />
        {/* frame ticks */}
        {Array.from({ length: frameCount }, (_, i) => (
          <span key={i} className="pointer-events-none absolute top-0 h-full w-px bg-[var(--mobile-app-card-border)]" style={{ left: pct(i) }} />
        ))}
        {/* in handle */}
        <div
          onMouseDown={startDrag("in")}
          title="Drag to set the in point"
          className="absolute top-0 z-10 h-full w-2 -translate-x-1/2 cursor-ew-resize rounded-sm bg-[var(--graphite-primary)]"
          style={{ left: pct(range.inIdx) }}
        />
        {/* out handle */}
        <div
          onMouseDown={startDrag("out")}
          title="Drag to set the out point"
          className="absolute top-0 z-10 h-full w-2 -translate-x-1/2 cursor-ew-resize rounded-sm bg-[var(--graphite-primary)]"
          style={{ left: pct(range.outIdx) }}
        />
        {/* playhead — z-below the in/out handles so a coincident start position
            (both default to index 0) still lets the operator grab the range
            handle first; the playhead is the secondary scrub tool. */}
        <div
          onMouseDown={startDrag("playhead")}
          title="Drag to scrub"
          className="absolute -top-1 z-0 h-[calc(100%+8px)] w-0.5 -translate-x-1/2 cursor-ew-resize bg-white"
          style={{ left: pct(range.playheadIdx) }}
        />
      </div>
    </div>
  );
}
