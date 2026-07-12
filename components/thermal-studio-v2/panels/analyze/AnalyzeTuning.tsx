"use client";

import { useState } from "react";
import { EMISSIVITY_MATERIALS } from "@/lib/thermal/emissivity-materials";
import { applyTuningBatch } from "@/components/thermal-studio-v2/lib/tuning-api";
import { KeepUndoToast } from "@/components/thermal-studio-v2/panels/analyze/KeepUndoToast";
import type { ThermalV2Capture, ThermalV2Scope, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

function Field({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  // Audit remediation Batch 3: the paired range slider is bounded, but this
  // number twin wasn't — 0/negative/garbage flowed straight into tuning
  // state and autosaved. Let live typing through unclamped (so e.g. typing
  // "0.5" isn't fought character-by-character), but clamp to the slider's
  // [min, max] on blur so what actually persists is always valid.
  function clamp(raw: number) {
    return Math.min(max, Math.max(min, raw));
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label title={hint} className="text-[11px] text-[var(--graphite-muted)]">
          {label}
        </label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = Number(e.target.value);
            if (Number.isFinite(raw)) onChange(raw);
          }}
          onBlur={(e) => {
            const raw = Number(e.target.value);
            onChange(clamp(Number.isFinite(raw) ? raw : min));
          }}
          className="w-16 border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-right text-[11px] text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--graphite-primary)]"
      />
    </div>
  );
}

function EnvField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label title={hint} className="flex flex-col gap-1 text-[var(--graphite-muted)]">
      {label}
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
      />
    </label>
  );
}

/** Right rail — Tuning accordion (doc §1, Tab 2 + §1b.2 live recompute, S5 batch). */
export function AnalyzeTuning({
  captureId,
  captures,
  tuning,
  baseEmissivity,
  onTuningChange,
  scope,
  scopeIds,
}: {
  captureId: string | null;
  captures: ThermalV2Capture[];
  tuning: ThermalV2Tuning;
  baseEmissivity: number;
  onTuningChange: (next: ThermalV2Tuning) => void;
  scope: ThermalV2Scope;
  scopeIds: string[];
}) {
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    previous: Map<string, ThermalV2Tuning>;
    ids: string[];
  } | null>(null);

  if (!captureId) {
    return <div className="p-2 text-xs text-[var(--graphite-muted)]">Open an image to tune it.</div>;
  }

  function patch(p: Partial<ThermalV2Tuning>) {
    onTuningChange({ ...tuning, ...p });
  }

  function resetToCameraValues() {
    onTuningChange({ emissivity: baseEmissivity, reflected_c: 20 });
  }

  const scopeLabel = scope.kind === "image" ? "This image" : scope.kind === "selected" ? `Selected (${scope.count})` : `All (${scope.count})`;

  async function applyToScope() {
    if (!scopeIds.length) return;
    setApplying(true);
    const previous = new Map<string, ThermalV2Tuning>();
    for (const id of scopeIds) {
      const cap = captures.find((c) => c.id === id);
      const prevTuning = (cap?.metadata as Record<string, unknown> | null)?.tuning as ThermalV2Tuning | undefined;
      previous.set(id, prevTuning ?? { emissivity: 0.95, reflected_c: 20 });
    }
    const result = await applyTuningBatch(scopeIds, tuning);
    setApplying(false);
    setToast({
      message: `Applied tuning to ${result.ok} image${result.ok === 1 ? "" : "s"}${result.failed ? ` (${result.failed} failed)` : ""}`,
      previous,
      ids: scopeIds,
    });
  }

  return (
    <div className="flex flex-col gap-4 p-1">
      <Field
        label="Emissivity"
        hint="How much of the surface's own heat (vs reflected heat) the camera is reading"
        value={tuning.emissivity}
        min={0.05}
        max={1}
        step={0.01}
        onChange={(v) => patch({ emissivity: v })}
      />
      <select
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) patch({ emissivity: v });
        }}
        value=""
        title="Set emissivity from a known material"
        className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--graphite-text-header)]"
      >
        <option value="">Set from material…</option>
        {EMISSIVITY_MATERIALS.map((m) => (
          <option key={m.material} value={m.emissivity}>
            {m.material} ({m.emissivity})
          </option>
        ))}
      </select>

      <Field
        label="Reflected temperature (°C)"
        hint="The apparent temperature of what's reflecting off the surface — usually ambient air"
        value={tuning.reflected_c}
        min={-20}
        max={60}
        step={0.5}
        onChange={(v) => patch({ reflected_c: v })}
      />

      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <EnvField label="Distance (m)" hint="Camera-to-target distance" value={tuning.distance_m} onChange={(v) => patch({ distance_m: v })} />
        <EnvField label="Humidity (%)" hint="Relative humidity at capture" value={tuning.humidity_pct} onChange={(v) => patch({ humidity_pct: v })} />
        <EnvField label="Atmosphere (°C)" hint="Air temperature between camera and target" value={tuning.atmospheric_c} onChange={(v) => patch({ atmospheric_c: v })} />
        <EnvField label="Ext. optics (°C)" hint="Temperature of any external lens or window" value={tuning.ext_optics_temp_c} onChange={(v) => patch({ ext_optics_temp_c: v })} />
        <EnvField label="Optics transmission" hint="How much infrared the external optics pass (0–1)" value={tuning.ext_optics_trans} onChange={(v) => patch({ ext_optics_trans: v })} />
        <EnvField label="Reference (°C)" hint="Known reference temperature in the scene" value={tuning.reference_temp_c} onChange={(v) => patch({ reference_temp_c: v })} />
      </div>

      <button
        type="button"
        onClick={resetToCameraValues}
        className="self-start text-[11px] text-[var(--graphite-muted)] underline hover:text-[var(--graphite-text-header)]"
      >
        Reset to camera values
      </button>

      <button
        type="button"
        disabled={applying || !scopeIds.length}
        onClick={() => void applyToScope()}
        title={`Apply this tuning to ${scopeLabel.toLowerCase()}`}
        className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {applying ? "Applying…" : `Apply to ${scopeLabel}`}
      </button>

      {toast ? (
        <KeepUndoToast
          message={toast.message}
          onKeep={() => setToast(null)}
          onUndo={() => {
            for (const id of toast.ids) {
              const prev = toast.previous.get(id);
              if (prev) {
                void applyTuningBatch([id], prev);
              }
            }
            setToast(null);
          }}
        />
      ) : null}
    </div>
  );
}
