"use client";

import { fmtTemp, fmtDelta, type Unit } from "@/lib/thermal/probe-palettes";
import { spotBadgeClass } from "@/components/ops/thermal/ThermalProbeMarkers";
import type { ProbeSpot } from "@/components/ops/thermal/ThermalProbeViewer";

/** Spot list: per-point temps, Δ-vs-reference, average, spread — FLIR-style. */
export function ThermalSpotsPanel({
  spots,
  refId,
  setRefId,
  unit,
  valueOf,
  onRemove,
}: {
  spots: ProbeSpot[];
  refId: string | null;
  setRefId: (id: string) => void;
  unit: Unit;
  /** Headline temperature for a target: point sample or area average. */
  valueOf: (spot: ProbeSpot) => number;
  /** Remove a spot from the list. */
  onRemove?: (id: string) => void;
}) {
  const refSpot = spots.find((s) => s.id === refId) ?? spots[0] ?? null;
  const spotTemps = spots.map((s) => valueOf(s));
  const spread = spotTemps.length >= 2 ? Math.max(...spotTemps) - Math.min(...spotTemps) : 0;
  const average = spotTemps.length ? spotTemps.reduce((a, b) => a + b, 0) / spotTemps.length : 0;

  return (
    <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
        Spots ({spots.length})
      </p>
      {spots.length === 0 ? (
        <p className="mt-1 text-xs text-[var(--graphite-muted)]">
          Pick a target tool, then click the image to plot a point. Each point lists its
          temperature and its Δ vs the reference — click a point&apos;s badge to make it the
          reference. Drag to move, ✕ to remove. Points save with the image automatically.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {spots.map((s, idx) => {
            const tC = valueOf(s);
            const dC = refSpot ? tC - valueOf(refSpot) : 0;
            const kindLabel = s.kind === "area" ? "area" : s.kind === "line" ? "line" : null;
            return (
              <li key={s.id} className="flex items-center gap-2 text-[var(--graphite-text-body)]">
                <button type="button" onClick={() => setRefId(s.id)} className="flex shrink-0 items-center gap-1.5" title="Set as Δ reference">
                  <span className={spotBadgeClass(s.id === refId)}>{idx + 1}</span>
                  {kindLabel ? <span className="text-[9px] uppercase text-[var(--graphite-muted)]">{kindLabel}</span> : null}
                  {s.imported ? <span className="text-[9px] uppercase text-[var(--graphite-muted)]">baked</span> : null}
                </button>
                <span className="ml-auto font-semibold tabular-nums">{fmtTemp(tC, unit)}</span>
                {refSpot && s.id !== refSpot.id ? (
                  <span className="w-14 text-right text-xs tabular-nums text-[var(--graphite-muted)]">Δ {fmtDelta(dC, unit)}</span>
                ) : (
                  <span className="w-14 text-right text-xs text-[var(--graphite-muted)]">ref</span>
                )}
                {onRemove ? (
                  <button type="button" onClick={() => onRemove(s.id)} title="Remove point"
                    className="shrink-0 rounded border border-[var(--mobile-app-card-border)] px-1 text-[11px] leading-none text-[var(--graphite-muted)] hover:text-[#fca5a5]">
                    ✕
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {spots.length >= 1 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--mobile-app-card-border)] pt-2 text-xs text-[var(--graphite-text-body)]">
          <div className="flex justify-between">
            <span>Average of spots</span>
            <span className="font-semibold tabular-nums">{fmtTemp(average, unit)}</span>
          </div>
          {spots.length >= 2 ? (
            <div className="flex justify-between">
              <span>Spread (max − min)</span>
              <span className="font-semibold tabular-nums">{fmtDelta(spread, unit)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
