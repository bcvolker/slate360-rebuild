"use client";

import { fmtTemp, fmtDelta, type Unit } from "@/lib/thermal/probe-palettes";
import type { ProbeSpot } from "@/components/ops/thermal/ThermalProbeViewer";

/** Right-rail spot list: temps, Δ-vs-reference, spread. */
export function ThermalSpotsPanel({
  spots,
  refId,
  setRefId,
  unit,
  valueOf,
}: {
  spots: ProbeSpot[];
  refId: string | null;
  setRefId: (id: string) => void;
  unit: Unit;
  /** Headline temperature for a target: point sample or area average. */
  valueOf: (spot: ProbeSpot) => number;
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
          Pick a target tool above, then click the image to place it. Drag to move,
          double-click to remove (including baked-in spots), drag an area's corner to
          resize. Click a number to set the Δ reference.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {spots.map((s, idx) => {
            const tC = valueOf(s);
            const dC = refSpot ? tC - valueOf(refSpot) : 0;
            return (
              <li key={s.id} className="flex items-center justify-between gap-2 text-[var(--graphite-text-body)]">
                <button type="button" onClick={() => setRefId(s.id)} className="flex items-center gap-1.5" title="Set as Δ reference">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white bg-[var(--graphite-primary)] ${s.id === refId ? "ring-2 ring-white" : ""}`}>
                    {idx + 1}
                  </span>
                  {s.kind === "area" ? <span className="text-[9px] uppercase text-[var(--graphite-muted)]">area</span> : null}
                  {s.imported ? <span className="text-[9px] uppercase text-[var(--graphite-muted)]">baked</span> : null}
                </button>
                <span className="ml-auto font-semibold tabular-nums">{fmtTemp(tC, unit)}</span>
                {refSpot && s.id !== refSpot.id ? (
                  <span className="w-16 text-right text-xs tabular-nums text-[var(--graphite-muted)]">Δ {fmtDelta(dC, unit)}</span>
                ) : (
                  <span className="w-16 text-right text-xs text-[var(--graphite-muted)]">ref</span>
                )}
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
