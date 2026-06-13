"use client";

import { useState } from "react";
import {
  DEFAULT_ANALYSIS_PARAMS,
  normalizeAnalysisParams,
  cToFDelta,
  fToCDelta,
  type ThermalAnalysisParams,
} from "@/lib/thermal/analysis-params";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Unit = "C" | "F";

export function ThermalTuningPanel({
  sessionId,
  initialParams,
}: {
  sessionId: string;
  initialParams?: unknown;
}) {
  const [params, setParams] = useState<ThermalAnalysisParams>(() =>
    normalizeAnalysisParams(initialParams),
  );
  const [unit, setUnit] = useState<Unit>("F");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dt = (c: number) => (unit === "F" ? cToFDelta(c) : c);
  const fromDt = (v: number) => (unit === "F" ? fToCDelta(v) : v);

  function set<K extends keyof ThermalAnalysisParams>(key: K, value: ThermalAnalysisParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  async function save(rerun: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const normalized = normalizeAnalysisParams(params);
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { analysis_params: normalized } }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save tuning");
      }
      if (rerun) {
        const jobRes = await fetch("/api/ops/thermal/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, job_type: "analyze" }),
        });
        if (!jobRes.ok) {
          const j = await jobRes.json().catch(() => ({}));
          throw new Error(j.error ?? "Saved, but failed to start re-analysis");
        }
        setNotice("Tuning saved — re-running anomaly analysis. Watch progress above.");
      } else {
        setNotice("Tuning saved. It applies on the next analysis run.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={t.card}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={t.eyebrow}>Anomaly tuning</p>
          <p className="mt-1 text-xs text-[var(--graphite-muted)]">
            Manual overrides for detection. Leave as-is for automatic defaults.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUnit((u) => (u === "F" ? "C" : "F"))}
          className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-medium text-[var(--graphite-text-body)]"
        >
          Δ in °{unit}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumField
          label={`Hot-spot ΔT (°${unit})`}
          value={Number(dt(params.hot_delta_c).toFixed(1))}
          step={0.5}
          onChange={(v) => set("hot_delta_c", fromDt(v))}
          disabled={!params.detect_hot}
        />
        <NumField
          label={`Cold-bridge ΔT (°${unit})`}
          value={Number(dt(params.cold_delta_c).toFixed(1))}
          step={0.5}
          onChange={(v) => set("cold_delta_c", fromDt(v))}
          disabled={!params.detect_cold}
        />
        <NumField
          label="Min area (pixels)"
          value={params.min_area_px}
          step={1}
          onChange={(v) => set("min_area_px", Math.round(v))}
        />
        <NumField
          label="Emissivity override"
          value={params.emissivity_override ?? 0}
          step={0.01}
          onChange={(v) => set("emissivity_override", v <= 0 ? null : v)}
          hint="0 = use file/default"
        />
        <NumField
          label={`Severity: Action ≥ (°${unit})`}
          value={Number(dt(params.severity_action_c).toFixed(1))}
          step={0.5}
          onChange={(v) => set("severity_action_c", fromDt(v))}
        />
        <NumField
          label={`Severity: Watch ≥ (°${unit})`}
          value={Number(dt(params.severity_watch_c).toFixed(1))}
          step={0.5}
          onChange={(v) => set("severity_watch_c", fromDt(v))}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Check label="Hot spots" on={params.detect_hot} onClick={() => set("detect_hot", !params.detect_hot)} />
        <Check label="Cold bridges" on={params.detect_cold} onClick={() => set("detect_cold", !params.detect_cold)} />
        <Check label="Linear streaks" on={params.detect_streaks} onClick={() => set("detect_streaks", !params.detect_streaks)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className={t.primaryButton} disabled={busy} onClick={() => save(true)}>
          Save &amp; re-run analysis
        </button>
        <button type="button" className={t.secondaryButton} disabled={busy} onClick={() => save(false)}>
          Save only
        </button>
        <button
          type="button"
          className="text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          disabled={busy}
          onClick={() => setParams(DEFAULT_ANALYSIS_PARAMS)}
        >
          Reset to auto defaults
        </button>
      </div>

      {notice ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}

function NumField({
  label,
  value,
  step,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-xs text-[var(--graphite-muted)]">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white disabled:opacity-40"
      />
      {hint ? <span className="mt-0.5 block text-[10px] text-[var(--graphite-muted)]">{hint}</span> : null}
    </label>
  );
}

function Check({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 font-medium transition-colors ${
        on
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
          : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
      }`}
    >
      {on ? "✓ " : ""}{label}
    </button>
  );
}
