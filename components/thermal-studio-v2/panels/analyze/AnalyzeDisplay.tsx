"use client";

import { computeHistogram, fmtTemp } from "@/lib/thermal/probe-palettes";
import { AnalyzeAlarmControls } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeAlarmControls";
import { AnalyzeSeverityBands } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeSeverityBands";
import { AnalyzeContrastFlicker } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeContrastFlicker";
import { AnalyzeFusionControls } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeFusionControls";
import type {
  ThermalV2Alarm,
  ThermalV2PairAlign,
  ThermalV2SeverityBands,
  ThermalV2Tuning,
} from "@/components/thermal-studio-v2/types";

/** Right rail — Display accordion (doc §1, Tab 2 + S5/S5.6): span, alarms, severity bands, sensitivity aids. */
export function AnalyzeDisplay({
  temps,
  span,
  gridMin,
  gridMax,
  unit,
  onSpanChange,
  alarm,
  onAlarmChange,
  tuning,
  severityBands,
  onSeverityBandsChange,
  localContrast,
  onLocalContrastChange,
  hasFlickerA,
  hasFlickerB,
  flickerShowing,
  autoFlicker,
  onAutoFlickerChange,
  onSnapshotFlickerA,
  onSnapshotFlickerB,
  onToggleFlickerView,
  onClearFlicker,
  hasPairedVisual,
  blend,
  onBlendChange,
  align,
  onNudge,
  onScaleChange,
  onResetAlign,
}: {
  temps: number[] | Float32Array | Float64Array | null;
  span: { lo: number; hi: number } | null;
  gridMin: number;
  gridMax: number;
  unit: "C" | "F";
  onSpanChange: (next: { lo: number; hi: number }) => void;
  alarm: ThermalV2Alarm;
  onAlarmChange: (next: ThermalV2Alarm) => void;
  tuning: ThermalV2Tuning;
  severityBands: ThermalV2SeverityBands;
  onSeverityBandsChange: (next: ThermalV2SeverityBands) => void;
  localContrast: boolean;
  onLocalContrastChange: (next: boolean) => void;
  hasFlickerA: boolean;
  hasFlickerB: boolean;
  flickerShowing: "A" | "B";
  autoFlicker: boolean;
  onAutoFlickerChange: (next: boolean) => void;
  onSnapshotFlickerA: () => void;
  onSnapshotFlickerB: () => void;
  onToggleFlickerView: () => void;
  onClearFlicker: () => void;
  /** S6.5 fusion: only offered when the active image has a matched visual-photo pair. */
  hasPairedVisual: boolean;
  blend: number;
  onBlendChange: (next: number) => void;
  align: ThermalV2PairAlign;
  onNudge: (dx: number, dy: number) => void;
  onScaleChange: (next: number) => void;
  onResetAlign: () => void;
}) {
  if (!temps || !span) {
    return <div className="p-2 text-xs text-[var(--graphite-muted)]">Open an image to adjust its display.</div>;
  }

  const bins = computeHistogram(temps, span.lo, span.hi, 32);
  const histMax = Math.max(1, ...bins);

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
          Low ({fmtTemp(span.lo, unit, false)})
          <input
            type="number"
            value={Math.round(span.lo * 10) / 10}
            onChange={(e) => onSpanChange({ lo: Number(e.target.value), hi: span.hi })}
            className="border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[var(--graphite-muted)]">
          High ({fmtTemp(span.hi, unit, false)})
          <input
            type="number"
            value={Math.round(span.hi * 10) / 10}
            onChange={(e) => onSpanChange({ lo: span.lo, hi: Number(e.target.value) })}
            className="border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
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

      <AnalyzeAlarmControls alarm={alarm} onAlarmChange={onAlarmChange} tuning={tuning} unit={unit} gridMin={gridMin} gridMax={gridMax} />
      <AnalyzeSeverityBands bands={severityBands} onBandsChange={onSeverityBandsChange} unit={unit} />
      <AnalyzeContrastFlicker
        localContrast={localContrast}
        onLocalContrastChange={onLocalContrastChange}
        hasA={hasFlickerA}
        hasB={hasFlickerB}
        flickerShowing={flickerShowing}
        autoFlicker={autoFlicker}
        onAutoFlickerChange={onAutoFlickerChange}
        onSnapshotA={onSnapshotFlickerA}
        onSnapshotB={onSnapshotFlickerB}
        onToggleView={onToggleFlickerView}
        onClearFlicker={onClearFlicker}
      />
      {hasPairedVisual ? (
        <AnalyzeFusionControls
          blend={blend}
          onBlendChange={onBlendChange}
          align={align}
          onNudge={onNudge}
          onScaleChange={onScaleChange}
          onResetAlign={onResetAlign}
        />
      ) : null}
    </div>
  );
}
