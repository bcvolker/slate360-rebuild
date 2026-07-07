"use client";

import { computeHistogram, fmtTemp } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Isotherm } from "@/components/thermal-studio-v2/types";

/** Right rail — Display accordion (doc §1, Tab 2 + S5): span, isotherm, histogram. */
export function AnalyzeDisplay({
  temps,
  span,
  gridMin,
  gridMax,
  unit,
  onSpanChange,
  isotherm,
  onIsothermChange,
}: {
  temps: number[] | Float32Array | Float64Array | null;
  span: { lo: number; hi: number } | null;
  gridMin: number;
  gridMax: number;
  unit: "C" | "F";
  onSpanChange: (next: { lo: number; hi: number }) => void;
  isotherm: ThermalV2Isotherm;
  onIsothermChange: (next: ThermalV2Isotherm) => void;
}) {
  if (!temps || !span) {
    return <div className="p-2 text-xs text-[var(--graphite-muted)]">Open an image to adjust its display.</div>;
  }

  const bins = computeHistogram(temps, span.lo, span.hi, 32);
  const histMax = Math.max(1, ...bins);

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
          Low ({fmtTemp(span.lo, unit, false)})
          <input
            type="number"
            value={Math.round(span.lo * 10) / 10}
            onChange={(e) => onSpanChange({ lo: Number(e.target.value), hi: span.hi })}
            className="rounded border border-[var(--mobile-app-card-border)] bg-transparent px-1 py-0.5 text-[var(--graphite-text-header)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
          High ({fmtTemp(span.hi, unit, false)})
          <input
            type="number"
            value={Math.round(span.hi * 10) / 10}
            onChange={(e) => onSpanChange({ lo: span.lo, hi: Number(e.target.value) })}
            className="rounded border border-[var(--mobile-app-card-border)] bg-transparent px-1 py-0.5 text-[var(--graphite-text-header)]"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => onSpanChange({ lo: gridMin, hi: gridMax })}
        className="self-start text-[11px] text-[var(--graphite-muted)] underline hover:text-[var(--graphite-text-header)]"
      >
        Reset to full range
      </button>

      <div className="flex h-16 items-end gap-px" title="How many pixels fall at each temperature within the current display range">
        {bins.map((count, i) => (
          <span
            key={i}
            style={{ height: `${(count / histMax) * 100}%` }}
            className="min-h-px flex-1 rounded-sm bg-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]"
          />
        ))}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
        <input
          type="checkbox"
          checked={!!isotherm}
          onChange={(e) => onIsothermChange(e.target.checked ? { lo: span.lo, hi: span.hi } : null)}
        />
        Isotherm — highlight only one temperature band
      </label>
      {isotherm ? (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
            Band low
            <input
              type="number"
              value={Math.round(isotherm.lo * 10) / 10}
              onChange={(e) => onIsothermChange({ lo: Number(e.target.value), hi: isotherm.hi })}
              className="rounded border border-[var(--mobile-app-card-border)] bg-transparent px-1 py-0.5 text-[var(--graphite-text-header)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
            Band high
            <input
              type="number"
              value={Math.round(isotherm.hi * 10) / 10}
              onChange={(e) => onIsothermChange({ lo: isotherm.lo, hi: Number(e.target.value) })}
              className="rounded border border-[var(--mobile-app-card-border)] bg-transparent px-1 py-0.5 text-[var(--graphite-text-header)]"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
