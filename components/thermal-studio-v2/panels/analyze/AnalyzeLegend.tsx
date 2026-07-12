"use client";

import { useCallback, useRef } from "react";
import { fmtTemp, samplePalette } from "@/lib/thermal/probe-palettes";

/**
 * Color-scale legend with draggable span handles (doc §1, Tab 2 + §1b.2):
 * dragging either handle updates lo/hi live, no debounce — the canvas repaints
 * every frame from the same numbers this legend displays, so they never disagree.
 */
export function AnalyzeLegend({
  palette,
  lo,
  hi,
  gridMin,
  gridMax,
  unit,
  onChange,
}: {
  palette: string;
  lo: number;
  hi: number;
  gridMin: number;
  gridMax: number;
  unit: "C" | "F";
  onChange: (next: { lo: number; hi: number }) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"lo" | "hi" | null>(null);

  const valueAt = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return null;
      const rect = track.getBoundingClientRect();
      const t = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      return gridMin + t * (gridMax - gridMin);
    },
    [gridMin, gridMax],
  );

  function startDrag(which: "lo" | "hi") {
    dragRef.current = which;
    function onMove(e: MouseEvent) {
      const v = valueAt(e.clientY);
      if (v === null || !dragRef.current) return;
      if (dragRef.current === "lo") onChange({ lo: Math.min(v, hi - 0.1), hi });
      else onChange({ lo, hi: Math.max(v, lo + 0.1) });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const swatches = Array.from({ length: 24 }, (_, i) => samplePalette(palette, i / 23));
  const loPct = gridMax > gridMin ? ((lo - gridMin) / (gridMax - gridMin)) * 100 : 0;
  const hiPct = gridMax > gridMin ? ((hi - gridMin) / (gridMax - gridMin)) * 100 : 100;

  return (
    <div className="flex h-full w-10 flex-col items-center gap-1 py-2" title="Drag the handles to change the display range">
      <span className="text-[10px] font-semibold text-[var(--graphite-text-header)]">{fmtTemp(hi, unit, false)}</span>
      <div
        ref={trackRef}
        className="relative w-3 flex-1 overflow-hidden rounded-full"
        style={{
          background: `linear-gradient(to top, ${swatches.map((c) => `rgb(${c[0]},${c[1]},${c[2]})`).join(",")})`,
        }}
      >
        <button
          type="button"
          onMouseDown={() => startDrag("hi")}
          aria-label={`Drag to change the high end — ${fmtTemp(hi, unit)}`}
          title={`High end — ${fmtTemp(hi, unit)}`}
          className="absolute left-1/2 h-2 w-6 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-sm border border-[var(--graphite-text-header)] bg-white/80"
          style={{ bottom: `${hiPct}%` }}
        />
        <button
          type="button"
          onMouseDown={() => startDrag("lo")}
          aria-label={`Drag to change the low end — ${fmtTemp(lo, unit)}`}
          title={`Low end — ${fmtTemp(lo, unit)}`}
          className="absolute left-1/2 h-2 w-6 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-sm border border-[var(--graphite-text-header)] bg-white/80"
          style={{ bottom: `${loPct}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-[var(--graphite-text-header)]">{fmtTemp(lo, unit, false)}</span>
    </div>
  );
}
