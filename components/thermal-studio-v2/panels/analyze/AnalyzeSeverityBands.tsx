"use client";

import { fmtDelta } from "@/lib/thermal/probe-palettes";
import type { ThermalV2SeverityBands } from "@/components/thermal-studio-v2/types";

/**
 * S5.6 severity-band presets — ΔT-vs-reference thresholds that drive
 * red/sky/neutral chips on Measurements rows (never amber, never a
 * certification claim — "-style" presets only, doc §1b.4).
 */
const PRESETS: { label: string; bands: ThermalV2SeverityBands }[] = [
  { label: "Off — no coloring", bands: null },
  { label: "Neutral defaults", bands: { advisory: 1, warning: 3, critical: 6 } },
  { label: "NETA-style ΔT", bands: { advisory: 1, warning: 4, critical: 8 } },
  { label: "RESNET-style envelope", bands: { advisory: 0.5, warning: 2, critical: 4 } },
];

function presetLabelFor(bands: ThermalV2SeverityBands): string {
  const match = PRESETS.find(
    (p) =>
      (p.bands === null && bands === null) ||
      (p.bands !== null && bands !== null && p.bands.advisory === bands.advisory && p.bands.warning === bands.warning && p.bands.critical === bands.critical),
  );
  return match?.label ?? "Custom";
}

export function AnalyzeSeverityBands({
  bands,
  onBandsChange,
  unit,
}: {
  bands: ThermalV2SeverityBands;
  onBandsChange: (next: ThermalV2SeverityBands) => void;
  unit: "C" | "F";
}) {
  const currentLabel = presetLabelFor(bands);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]">
        Severity bands — colors Measurements' Δ vs reference
        <select
          value={currentLabel}
          onChange={(e) => {
            const preset = PRESETS.find((p) => p.label === e.target.value);
            if (preset) onBandsChange(preset.bands);
          }}
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--graphite-text-header)]"
        >
          {currentLabel === "Custom" ? <option value="Custom">Custom</option> : null}
          {PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {bands ? (
        <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--graphite-muted)]">
          {(["advisory", "warning", "critical"] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              {key[0].toUpperCase() + key.slice(1)} ({fmtDelta(bands[key], unit)})
              <input
                type="number"
                min={0}
                step={0.5}
                value={bands[key]}
                onChange={(e) => onBandsChange({ ...bands, [key]: Number(e.target.value) })}
                className="border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
