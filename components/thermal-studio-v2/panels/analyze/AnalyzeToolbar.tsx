"use client";

import { PALETTE_NAMES, fmtTemp } from "@/lib/thermal/probe-palettes";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";

/**
 * One-row toolbar above the viewer (doc §1, Tab 2). Palette + °C/°F are real
 * (S3). Point/Area/Line/Move-Select are named per spec but stay text-only
 * until S4 gives them something to do — no dead buttons (doc §0.5).
 */
export function AnalyzeToolbar({
  palette,
  onPaletteChange,
  unit,
  onUnitChange,
  hover,
}: {
  palette: string;
  onPaletteChange: (p: string) => void;
  unit: "C" | "F";
  onUnitChange: (u: "C" | "F") => void;
  hover: HoverInfo;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="text-[11px] text-[var(--graphite-muted)]" title="Measurement tools arrive in the next build slice">
        Move/Select (default) · Point · Area · Line — S4
      </span>
      <div className="flex items-center gap-2">
        {hover ? (
          <span className="text-[11px] font-semibold text-[var(--graphite-text-header)]">
            {fmtTemp(hover.tempC, unit)}
          </span>
        ) : null}
        <select
          value={palette}
          onChange={(e) => onPaletteChange(e.target.value)}
          title="Color palette"
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-1.5 py-0.5 text-[11px] text-[var(--graphite-text-header)]"
        >
          {PALETTE_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--mobile-app-card-border)] text-[11px]">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUnitChange(u)}
              className={`px-1.5 py-0.5 font-semibold ${
                unit === u ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"
              }`}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
