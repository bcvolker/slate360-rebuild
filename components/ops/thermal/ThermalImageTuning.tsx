"use client";

import { fmtTemp, type Unit } from "@/lib/thermal/probe-palettes";
import { EMISSIVITY_MATERIALS } from "@/lib/thermal/emissivity-materials";

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
  histogram,
  distanceM,
  humidityPct,
  atmosphericC,
  onDistanceM,
  onHumidityPct,
  onAtmosphericC,
  isoOn,
  isoLo,
  isoHi,
  onIsoToggle,
  onIsoLo,
  onIsoHi,
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
  histogram?: number[];
  distanceM?: number;
  humidityPct?: number;
  atmosphericC?: number;
  onDistanceM?: (v: number) => void;
  onHumidityPct?: (v: number) => void;
  onAtmosphericC?: (v: number) => void;
  isoOn?: boolean;
  isoLo?: number;
  isoHi?: number;
  onIsoToggle?: () => void;
  onIsoLo?: (v: number) => void;
  onIsoHi?: (v: number) => void;
}) {
  const dirty = Math.abs(emissivity - baseEmissivity) > 1e-4;
  // Convert the °C model values to the active unit for editing, and back on change.
  const toUnit = (c: number) => (unit === "F" ? (c * 9) / 5 + 32 : c);
  const fromUnit = (v: number) => (unit === "F" ? ((v - 32) * 5) / 9 : v);
  const histMax = histogram && histogram.length ? Math.max(...histogram, 1) : 1;
  const numField =
    "mt-0.5 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-sm text-[var(--graphite-text-body)]";

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

      <select
        aria-label="Emissivity from material"
        value=""
        onChange={(e) => { if (e.target.value) onEmissivity(Number(e.target.value)); }}
        className="mt-1 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[#111827] px-2 py-1 text-xs text-[var(--graphite-text-body)]"
      >
        <option value="">Set from material…</option>
        {EMISSIVITY_MATERIALS.map((m) => (
          <option key={m.material} value={m.emissivity}>
            {m.material} ({m.emissivity.toFixed(2)})
          </option>
        ))}
      </select>

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
        {histogram && histogram.length ? (
          <div
            className="mt-2 flex h-10 items-end gap-px"
            aria-label="Temperature distribution histogram"
          >
            {histogram.map((count, i) => (
              <span
                key={i}
                className="flex-1 rounded-sm bg-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]"
                style={{ height: `${Math.max(2, (count / histMax) * 100)}%` }}
              />
            ))}
          </div>
        ) : null}
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

      {/* Isotherm — spotlight a temperature band, grayscale the rest. */}
      {onIsoToggle ? (
        <div className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2">
          <label className="flex items-center justify-between text-xs text-[var(--graphite-muted)]">
            <span>Isotherm band</span>
            <input
              type="checkbox"
              checked={Boolean(isoOn)}
              onChange={onIsoToggle}
              className="accent-[var(--graphite-primary)]"
            />
          </label>
          {isoOn ? (
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className="text-[10px] text-[var(--graphite-muted)]">
                Band low
                <input
                  type="number"
                  value={Number(toUnit(isoLo ?? dataMin).toFixed(1))}
                  onChange={(e) => onIsoLo?.(fromUnit(Number(e.target.value)))}
                  step={0.5}
                  className={numField}
                />
              </label>
              <label className="text-[10px] text-[var(--graphite-muted)]">
                Band high
                <input
                  type="number"
                  value={Number(toUnit(isoHi ?? dataMax).toFixed(1))}
                  onChange={(e) => onIsoHi?.(fromUnit(Number(e.target.value)))}
                  step={0.5}
                  className={numField}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Environment parameters — captured for the report (not applied to preview). */}
      {onDistanceM || onHumidityPct || onAtmosphericC ? (
        <div className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
            Environment
          </p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <label className="text-[10px] text-[var(--graphite-muted)]">
              Distance (m)
              <input type="number" value={distanceM ?? ""} step={0.5}
                onChange={(e) => onDistanceM?.(Number(e.target.value))} className={numField} />
            </label>
            <label className="text-[10px] text-[var(--graphite-muted)]">
              Humidity (%)
              <input type="number" value={humidityPct ?? ""} step={1}
                onChange={(e) => onHumidityPct?.(Number(e.target.value))} className={numField} />
            </label>
            <label className="text-[10px] text-[var(--graphite-muted)]">
              Atmos (°C)
              <input type="number" value={atmosphericC ?? ""} step={0.5}
                onChange={(e) => onAtmosphericC?.(Number(e.target.value))} className={numField} />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
