"use client";

import type { ThermalV2PairAlign } from "@/components/thermal-studio-v2/types";

const NUDGE_STEP = 2;

/** S6.5 fusion blend — Display accordion, only rendered when the active image has a paired visual photo. */
export function AnalyzeFusionControls({
  blend,
  onBlendChange,
  align,
  onNudge,
  onScaleChange,
  onResetAlign,
}: {
  blend: number;
  onBlendChange: (next: number) => void;
  align: ThermalV2PairAlign;
  onNudge: (dx: number, dy: number) => void;
  onScaleChange: (next: number) => void;
  onResetAlign: () => void;
}) {
  const arrowClass =
    "rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]";
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--mobile-app-card-border)] pt-3">
      <span className="text-[11px] text-[var(--graphite-muted)]">Fusion — thermal over paired visual photo</span>
      <div className="flex flex-col gap-1 text-[11px] text-[var(--graphite-text-header)]">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="fusion-blend-range" className="min-w-0 truncate">
            Blend ({blend}% thermal)
          </label>
          <input
            type="number"
            aria-label="Thermal blend, percent"
            min={0}
            max={100}
            value={blend}
            onChange={(e) => onBlendChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="w-14 shrink-0 border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-right text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
          />
        </div>
        <input id="fusion-blend-range" type="range" min={0} max={100} value={blend} onChange={(e) => onBlendChange(Number(e.target.value))} />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
        <span className="text-[var(--graphite-muted)]">Align photo</span>
        <button type="button" aria-label="Nudge left" title="Nudge left" className={arrowClass} onClick={() => onNudge(-NUDGE_STEP, 0)}>
          ←
        </button>
        <button type="button" aria-label="Nudge up" title="Nudge up" className={arrowClass} onClick={() => onNudge(0, -NUDGE_STEP)}>
          ↑
        </button>
        <button type="button" aria-label="Nudge down" title="Nudge down" className={arrowClass} onClick={() => onNudge(0, NUDGE_STEP)}>
          ↓
        </button>
        <button type="button" aria-label="Nudge right" title="Nudge right" className={arrowClass} onClick={() => onNudge(NUDGE_STEP, 0)}>
          →
        </button>
      </div>
      <div className="flex flex-col gap-1 text-[11px] text-[var(--graphite-text-header)]">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="fusion-scale-range" className="min-w-0 truncate">
            Scale ({Math.round(align.scale * 100)}%)
          </label>
          <input
            type="number"
            aria-label="Photo scale, percent"
            min={50}
            max={200}
            value={Math.round(align.scale * 100)}
            onChange={(e) => onScaleChange(Math.min(200, Math.max(50, Number(e.target.value) || 100)) / 100)}
            className="w-14 shrink-0 border-b border-[var(--mobile-app-card-border)] bg-transparent py-0.5 text-right text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
          />
        </div>
        <input
          id="fusion-scale-range"
          type="range"
          min={50}
          max={200}
          value={Math.round(align.scale * 100)}
          onChange={(e) => onScaleChange(Number(e.target.value) / 100)}
        />
      </div>
      <button
        type="button"
        onClick={onResetAlign}
        className="self-start text-[11px] text-[var(--graphite-muted)] underline hover:text-[var(--graphite-text-header)]"
      >
        Reset alignment
      </button>
    </div>
  );
}
