"use client";

import { dewPointC } from "@/lib/thermal/psychrometrics";
import { fmtTemp } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Alarm, ThermalV2AlarmMode, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

const MODES: { id: ThermalV2AlarmMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "above", label: "Above limit" },
  { id: "below", label: "Below limit" },
  { id: "interval", label: "Interval (band)" },
  { id: "dewpoint", label: "Dew point risk" },
  { id: "insulation", label: "Insulation deficiency" },
];

const numberField = "border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none";

/**
 * S5.6 alarm suite: replaces the old single-band isotherm checkbox with a
 * mode picker (doc: off/above/below/interval/dewpoint/insulation) and each
 * mode's own inline fields. The effective highlight band is computed
 * caller-side (lib/thermal/alarm-band.ts) — this component only edits state.
 */
export function AnalyzeAlarmControls({
  alarm,
  onAlarmChange,
  tuning,
  unit,
  gridMin,
  gridMax,
}: {
  alarm: ThermalV2Alarm;
  onAlarmChange: (next: ThermalV2Alarm) => void;
  tuning: ThermalV2Tuning;
  unit: "C" | "F";
  gridMin: number;
  gridMax: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]">
        Alarm mode — highlight one condition, dim the rest
        <select
          value={alarm.mode}
          onChange={(e) => onAlarmChange({ mode: e.target.value as ThermalV2AlarmMode })}
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--graphite-text-header)]"
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {alarm.mode === "above" ? (
        <label className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]">
          Limit ({fmtTemp(alarm.lo ?? 0, unit, false)}) — highlight everything hotter
          <input
            type="number"
            value={alarm.lo ?? 0}
            onChange={(e) => onAlarmChange({ ...alarm, lo: Number(e.target.value) })}
            className={numberField}
          />
        </label>
      ) : null}

      {alarm.mode === "below" ? (
        <label className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]">
          Limit ({fmtTemp(alarm.hi ?? 0, unit, false)}) — highlight everything colder
          <input
            type="number"
            value={alarm.hi ?? 0}
            onChange={(e) => onAlarmChange({ ...alarm, hi: Number(e.target.value) })}
            className={numberField}
          />
        </label>
      ) : null}

      {alarm.mode === "interval" ? (
        <>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
              Band low ({fmtTemp(alarm.lo ?? gridMin, unit, false)})
              <input
                type="number"
                value={alarm.lo ?? gridMin}
                onChange={(e) => onAlarmChange({ ...alarm, lo: Number(e.target.value) })}
                className={numberField}
              />
            </label>
            <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
              Band high ({fmtTemp(alarm.hi ?? gridMax, unit, false)})
              <input
                type="number"
                value={alarm.hi ?? gridMax}
                onChange={(e) => onAlarmChange({ ...alarm, hi: Number(e.target.value) })}
                className={numberField}
              />
            </label>
          </div>
          <label
            className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]"
            title="Drag to scan this band across the full range — watch which pixels light up"
          >
            Sweep
            <input
              type="range"
              min={gridMin}
              max={gridMax}
              step={(gridMax - gridMin) / 200 || 0.1}
              value={((alarm.lo ?? gridMin) + (alarm.hi ?? gridMax)) / 2}
              onChange={(e) => {
                const center = Number(e.target.value);
                const width = (alarm.hi ?? gridMax) - (alarm.lo ?? gridMin) || (gridMax - gridMin) * 0.05;
                onAlarmChange({ ...alarm, lo: center - width / 2, hi: center + width / 2 });
              }}
              className="w-full accent-[var(--graphite-primary)]"
            />
          </label>
        </>
      ) : null}

      {alarm.mode === "dewpoint" ? (
        <div className="flex flex-col gap-2 text-[11px] text-[var(--graphite-muted)]">
          <label className="flex flex-col gap-1">
            Air temp ({fmtTemp(alarm.indoor_c ?? tuning.atmospheric_c ?? 20, unit, false)})
            <input
              type="number"
              value={alarm.indoor_c ?? tuning.atmospheric_c ?? 20}
              onChange={(e) => onAlarmChange({ ...alarm, indoor_c: Number(e.target.value) })}
              className={numberField}
            />
          </label>
          <label className="flex flex-col gap-1">
            Margin above dew point ({fmtTemp(alarm.margin ?? 2, unit, false)})
            <input
              type="number"
              value={alarm.margin ?? 2}
              onChange={(e) => onAlarmChange({ ...alarm, margin: Number(e.target.value) })}
              className={numberField}
            />
          </label>
          <div>
            RH {Math.round(tuning.humidity_pct ?? 50)}% (Tuning) — dew point{" "}
            {fmtTemp(dewPointC(alarm.indoor_c ?? tuning.atmospheric_c ?? 20, tuning.humidity_pct ?? 50), unit)}
          </div>
        </div>
      ) : null}

      {alarm.mode === "insulation" ? (
        <div className="grid grid-cols-2 gap-3 text-[11px] text-[var(--graphite-muted)]">
          <label className="flex flex-col gap-1">
            Indoor ({fmtTemp(alarm.indoor_c ?? 20, unit, false)})
            <input
              type="number"
              value={alarm.indoor_c ?? 20}
              onChange={(e) => onAlarmChange({ ...alarm, indoor_c: Number(e.target.value) })}
              className={numberField}
            />
          </label>
          <label className="flex flex-col gap-1">
            Outdoor ({fmtTemp(alarm.outdoor_c ?? 0, unit, false)})
            <input
              type="number"
              value={alarm.outdoor_c ?? 0}
              onChange={(e) => onAlarmChange({ ...alarm, outdoor_c: Number(e.target.value) })}
              className={numberField}
            />
          </label>
          <div className="col-span-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[var(--graphite-muted)]" title="Thermographic-index-style threshold: 100% = as warm as indoor air, 0% = as cold as outdoor air">
                Threshold factor
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round((alarm.factor ?? 0.7) * 100)}
                onChange={(e) => onAlarmChange({ ...alarm, factor: Number(e.target.value) / 100 })}
                className="w-16 border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-right text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={alarm.factor ?? 0.7}
              onChange={(e) => onAlarmChange({ ...alarm, factor: Number(e.target.value) })}
              className="w-full accent-[var(--graphite-primary)]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
