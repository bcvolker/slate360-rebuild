"use client";

import { severityMeta, type ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

/**
 * Renders detected-anomaly bounding boxes over the probe canvas.
 * Coordinates are bbox pixel values scaled to the displayed image as percentages,
 * matching how spots/extremes are positioned (so boxes track the scaled canvas).
 */
export function ThermalAnomalyOverlay({
  anomalies,
  width,
  height,
  selectedId,
  onSelect,
}: {
  anomalies: ThermalAnomaly[];
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const pct = (v: number, total: number) => `${(v / (total || 1)) * 100}%`;

  return (
    <>
      {anomalies.map((a, i) => {
        if (!a.bbox) return null;
        const meta = severityMeta(a.severity);
        const selected = a.id === selectedId;
        return (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(a.id);
            }}
            className={`absolute z-[15] flex items-start justify-start border-2 transition-opacity ${
              selected ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
            style={{
              left: pct(a.bbox.x, width),
              top: pct(a.bbox.y, height),
              width: pct(a.bbox.w, width),
              height: pct(a.bbox.h, height),
              borderColor: meta.color,
              boxShadow: selected ? `0 0 0 2px ${meta.color}` : undefined,
            }}
            aria-label={`Finding ${i + 1}`}
          >
            <span
              className="-translate-x-1 -translate-y-[55%] rounded px-1 text-[9px] font-bold leading-tight text-black"
              style={{ background: meta.color }}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </>
  );
}
