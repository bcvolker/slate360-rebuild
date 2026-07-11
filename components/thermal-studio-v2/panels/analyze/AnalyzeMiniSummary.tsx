import { fmtTemp } from "@/lib/thermal/probe-palettes";

function arrayMinMaxAvg(temps: number[] | Float32Array | Float64Array): { min: number; max: number; avg: number } {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < temps.length; i++) {
    const v = temps[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: temps.length ? sum / temps.length : 0 };
}

/** W1 sticky mini-summary: always-visible Max/Min/Avg above the right-rail accordions. */
export function AnalyzeMiniSummary({ temps, unit }: { temps: number[] | Float32Array | Float64Array | null; unit: "C" | "F" }) {
  if (!temps) return null;
  const { max, min, avg } = arrayMinMaxAvg(temps);
  return (
    <div className="shrink-0 border-b border-[var(--mobile-app-card-border)] px-1 py-2 text-[11px] tabular-nums text-[var(--graphite-muted)]">
      Max {fmtTemp(max, unit)} · Min {fmtTemp(min, unit)} · Avg {fmtTemp(avg, unit)}
    </div>
  );
}
