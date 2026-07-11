"use client";

import type { ThermalV2DisplayTransform } from "@/components/thermal-studio-v2/types";

/** AnalyzeToolbar's "⋯ More display settings" dropdown — units + S5.6 rotate/flip. Extracted for the file-size gate. */
export function AnalyzeMoreMenu({
  unit,
  onUnitChange,
  displayTransform,
  onRotate90,
  onFlipHorizontal,
  onFlipVertical,
  onResetTransform,
}: {
  unit: "C" | "F";
  onUnitChange: (u: "C" | "F") => void;
  displayTransform?: ThermalV2DisplayTransform;
  onRotate90?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onResetTransform?: () => void;
}) {
  const isRotated = !!displayTransform && (displayTransform.rotation !== 0 || displayTransform.flipH || displayTransform.flipV);

  return (
    <div className="absolute left-0 top-8 z-50 flex flex-col gap-1 rounded-md border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] p-2 text-[11px] shadow-lg">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Units</span>
      <div className="inline-flex overflow-hidden rounded-md border border-[var(--mobile-app-card-border)]">
        {(["C", "F"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnitChange(u)}
            className={`px-2.5 py-1 font-semibold ${
              unit === u
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            }`}
          >
            °{u}
          </button>
        ))}
      </div>
      <span className="mt-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Rotate / flip</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onRotate90}
          title="Rotate 90° clockwise (non-destructive — the grid itself never changes)"
          className="rounded px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          ⟳ 90°
        </button>
        <button
          type="button"
          onClick={onFlipHorizontal}
          title="Flip horizontally"
          className="rounded px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          ⇋ H
        </button>
        <button
          type="button"
          onClick={onFlipVertical}
          title="Flip vertically"
          className="rounded px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          ⇵ V
        </button>
      </div>
      {isRotated ? (
        <button type="button" onClick={onResetTransform} className="self-start px-1 text-[var(--graphite-muted)] underline hover:text-[var(--graphite-text-header)]">
          Reset rotation
        </button>
      ) : null}
    </div>
  );
}
