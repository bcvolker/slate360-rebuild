"use client";

import type { ReactElement } from "react";

export type TwinLayerMode = "mesh" | "splat" | "both";

const LAYERS: { id: TwinLayerMode; label: string }[] = [
  { id: "splat", label: "Reality" },
  { id: "both", label: "Hybrid" },
  { id: "mesh", label: "Geometry" },
];

const BUTTON =
  "flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-xs font-medium uppercase tracking-wide transition-colors";

export function WalkthroughLayerToggle({
  layerMode,
  onLayerModeChange,
}: {
  layerMode: TwinLayerMode;
  onLayerModeChange: (mode: TwinLayerMode) => void;
}): ReactElement {
  return (
    <div
      className="pointer-events-auto flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {LAYERS.map(({ id, label }) => {
        const active = layerMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onLayerModeChange(id)}
            aria-label={`${label} layer`}
            aria-pressed={active}
            className={`${BUTTON} ${
              active
                ? "bg-white/[0.06] text-[var(--twin360-blue)]"
                : "text-white/60 hover:text-white/90"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
