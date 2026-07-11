import { lineProfile, spotStats } from "@/lib/thermal/spot-stats";
import { fmtDelta, fmtTemp } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";

const KIND_WORD: Record<string, string> = { point: "Point", area: "Area", line: "Line", polygon: "Polygon" };

/** S5.6 — the pinned Δ-between-two-measurements line, shown under the Measurements list. */
export function ComparePin({
  spots,
  grid,
  unit,
  comparePair,
  onClear,
}: {
  spots: ThermalV2Spot[];
  grid: ThermalV2Grid;
  unit: "C" | "F";
  comparePair: [string, string];
  onClear: () => void;
}) {
  const iA = spots.findIndex((s) => s.id === comparePair[0]);
  const iB = spots.findIndex((s) => s.id === comparePair[1]);
  if (iA < 0 || iB < 0) return null;
  const vA = spotStats(spots[iA], grid.temps, grid.width, grid.height).value;
  const vB = spotStats(spots[iB], grid.temps, grid.width, grid.height).value;
  return (
    <div className="flex shrink-0 items-center justify-between rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px]">
      <span className="text-[var(--graphite-text-header)]">
        #{iB + 1} vs #{iA + 1}: Δ {fmtDelta(vB - vA, unit)}
      </span>
      <button type="button" onClick={onClear} className="text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
        ✕
      </button>
    </div>
  );
}

/** S5.6 — inline SVG line-profile chart (no chart library) for the selected line spot. */
export function LineProfileChart({ spot, grid, unit }: { spot: ThermalV2Spot; grid: ThermalV2Grid; unit: "C" | "F" }) {
  const values = lineProfile(spot, grid.temps, grid.width, grid.height);
  if (values.length < 2) return null;
  const w = 220;
  const h = 80;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * h}`).join(" ");

  return (
    <div className="flex shrink-0 flex-col gap-1 rounded-md border border-[var(--mobile-app-card-border)] p-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
        Line profile — {KIND_WORD.line}
      </span>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="var(--graphite-primary)" strokeWidth={1.5} />
      </svg>
      <div className="flex justify-between text-[10px] text-[var(--graphite-muted)]">
        <span>Min {fmtTemp(min, unit)}</span>
        <span>Max {fmtTemp(max, unit)}</span>
      </div>
    </div>
  );
}
