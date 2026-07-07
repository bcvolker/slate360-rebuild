"use client";

import { PALETTE_NAMES, fmtTemp } from "@/lib/thermal/probe-palettes";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";
import type { ThermalV2Tool } from "@/components/thermal-studio-v2/types";

const TOOLS: { id: ThermalV2Tool; label: string; hint: string }[] = [
  { id: "move", label: "Move/Select", hint: "Select existing measurements to drag, resize, or delete" },
  { id: "point", label: "Point", hint: "Click the image to read one pixel's temperature" },
  { id: "area", label: "Area", hint: "Click the image to average a region's temperature" },
  { id: "line", label: "Line", hint: "Click the image to average along a line" },
];

/** One-row toolbar above the viewer (doc §1, Tab 2). Tools, palette, °C/°F, undo/redo — all real (S3+S4). */
export function AnalyzeToolbar({
  palette,
  onPaletteChange,
  unit,
  onUnitChange,
  hover,
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  palette: string;
  onPaletteChange: (p: string) => void;
  unit: "C" | "F";
  onUnitChange: (u: "C" | "F") => void;
  hover: HoverInfo;
  tool: ThermalV2Tool;
  onToolChange: (t: ThermalV2Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--mobile-app-card-border)] text-[11px]">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onToolChange(t.id)}
              title={t.hint}
              className={`px-2 py-1 font-medium ${
                tool === t.id
                  ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                  : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↷
          </button>
        </div>
      </div>
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
