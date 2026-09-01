"use client";

import type { ReactElement } from "react";

export function KitchenProofHud({
  layer,
  onLayer,
  meshOpacity,
  onMeshOpacity,
  viewMode,
  onViewMode,
  measureActive,
  onToggleMeasure,
}: {
  layer: "reality" | "hybrid" | "geometry";
  onLayer: (layer: "reality" | "hybrid" | "geometry") => void;
  meshOpacity: number;
  onMeshOpacity: (value: number) => void;
  viewMode: "inside" | "dollhouse" | "floorplan";
  onViewMode: (mode: "inside" | "dollhouse" | "floorplan") => void;
  measureActive: boolean;
  onToggleMeasure: () => void;
}): ReactElement {
  const layers = [
    { id: "reality" as const, label: "Reality" },
    { id: "hybrid" as const, label: "Hybrid" },
    { id: "geometry" as const, label: "Geometry" },
  ];
  const views = [
    { id: "inside" as const, label: "Inside" },
    { id: "dollhouse" as const, label: "Dollhouse" },
    { id: "floorplan" as const, label: "Plan" },
  ];
  const btn =
    "flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-xs font-medium uppercase tracking-wide";
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <div
        className="pointer-events-auto flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {layers.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={layer === item.id}
            onClick={() => onLayer(item.id)}
            className={`${btn} ${
              layer === item.id
                ? "bg-white/[0.06] text-[var(--twin360-blue)]"
                : "text-white/60 hover:text-white/90"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {layer === "hybrid" ? (
        <label
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-wide text-white/70 backdrop-blur-xl"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Geometry
          <input
            type="range"
            min={0.08}
            max={0.85}
            step={0.02}
            value={meshOpacity}
            aria-label="Geometry overlay opacity"
            onChange={(e) => onMeshOpacity(Number(e.target.value))}
          />
        </label>
      ) : null}
      <div
        className="pointer-events-auto flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={viewMode === item.id}
            onClick={() => onViewMode(item.id)}
            className={`${btn} ${
              viewMode === item.id
                ? "bg-white/[0.06] text-[var(--twin360-blue)]"
                : "text-white/60 hover:text-white/90"
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Measure"
          aria-pressed={measureActive}
          onClick={onToggleMeasure}
          className={`${btn} border-l border-white/10 ${
            measureActive ? "text-[var(--twin360-blue)]" : "text-white/60 hover:text-white/90"
          }`}
        >
          Measure
        </button>
      </div>
    </div>
  );
}
