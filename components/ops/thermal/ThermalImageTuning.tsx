"use client";

import { fmtTemp, type Unit } from "@/lib/thermal/probe-palettes";

/**
 * Per-image radiometric tuning — emissivity, reflected (apparent) temperature, and
 * the display range (span/level: upper/lower bounds of the color scale).
 */
export function ThermalImageTuning({
  emissivity,
  reflectedC,
  baseEmissivity,
  onEmissivity,
  onReflected,
  onReset,
  unit,
  dataMin,
  dataMax,
  rangeMin,
  rangeMax,
  rangeManual,
  onRangeMin,
  onRangeMax,
  onRangeAuto,
}: {
  emissivity: number;
  reflectedC: number;
  baseEmissivity: number;
  onEmissivity: (v: number) => void;
  onReflected: (v: number) => void;
  onReset: () => void;
  unit: Unit;
  dataMin: number;
  dataMax: number;
  rangeMin: number;
  rangeMax: number;
  rangeManual: boolean;
  onRangeMin: (v: number) => void;
  onRangeMax: (v: number) => void;
  onRangeAuto: () => void;
}) {
  const dirty = Math.abs(emissivity - baseEmissivity) > 1e-4;
  // Convert the °C model values to the active unit for editing, and back on change.
  const toUnit = (c: number) => (unit === "F" ? (c * 9) / 5 + 32 : c);
  const fromUnit = (v: number) => (unit === "F" ? ((v - 32) * 5) / 9 : v);

  return (
    <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
          Image tuning
        </p>
        {dirty ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          >
            Reset
          </button>
        ) : null}
      </div>

      <label className="mt-2 block text-xs text-[var(--graphite-muted)]">
        <span className="flex justify-between">
          <span>Emissivity</span>
          <span className="font-semibold tabular-nums text-[var(--graphite-text-body)]">
            {emissivity.toFixed(2)}
          </span>
        </span>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.01}
          value={emissivity}
          onChange={(e) => onEmissivity(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--graphite-primary)]"
        />
      </label>

      <label className="mt-2 block text-xs text-[var(--graphite-muted)]">
        Reflected temp (°C)
        <input
          type="number"
          value={Number.isFinite(reflectedC) ? reflectedC : 20}
          onChange={(e) => onReflected(Number(e.target.value))}
          step={0.5}
          className="mt-1 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-sm text-[var(--graphite-text-body)]"
        />
      </label>

      {dirty ? (
        <p className="mt-2 text-[10px] leading-snug text-[var(--graphite-muted)]">
          Gray-body preview — run a server re-extract for calibrated values.
        </p>
      ) : null}

      <div className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--graphite-muted)]">Display range (span)</span>
          {rangeManual ? (
            <button
              type="button"
              onClick={onRangeAuto}
              className="text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              Auto
            </button>
          ) : (
            <span className="text-[10px] text-[var(--graphite-muted)]">auto</span>
          )}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <label className="text-[10px] text-[var(--graphite-muted)]">
            Lower
            <input
              type="number"
              value={Number(toUnit(rangeMin).toFixed(1))}
              onChange={(e) => onRangeMin(fromUnit(Number(e.target.value)))}
              step={0.5}
              className="mt-0.5 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-sm text-[var(--graphite-text-body)]"
            />
          </label>
          <label className="text-[10px] text-[var(--graphite-muted)]">
            Upper
            <input
              type="number"
              value={Number(toUnit(rangeMax).toFixed(1))}
              onChange={(e) => onRangeMax(fromUnit(Number(e.target.value)))}
              step={0.5}
              className="mt-0.5 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-sm text-[var(--graphite-text-body)]"
            />
          </label>
        </div>
        <p className="mt-1 text-[10px] text-[var(--graphite-muted)]">
          Data {fmtTemp(dataMin, unit)} – {fmtTemp(dataMax, unit)}. Narrow the span to boost contrast.
        </p>
      </div>
    </div>
  );
}
