"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";

/**
 * On-canvas overlay for one measurement (doc §1, Tab 2 + §0.1 editability law).
 * Plain absolutely-positioned divs/SVG layered over the stage (not canvas
 * drawing) so every spot is a real DOM element that can be clicked, dragged,
 * resized, and deleted directly.
 */
export function SpotOverlay({
  spot,
  index,
  gridWidth,
  gridHeight,
  selected,
  isReference,
  onSelect,
  onDelete,
  onDragStart,
  onResizeStart,
  onLineEndStart,
}: {
  spot: ThermalV2Spot;
  index: number;
  gridWidth: number;
  gridHeight: number;
  selected: boolean;
  isReference: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;
  onLineEndStart: (e: ReactMouseEvent, which: "start" | "end") => void;
}) {
  const pctX = (v: number) => `${(v / gridWidth) * 100}%`;
  const pctY = (v: number) => `${(v / gridHeight) * 100}%`;

  const badge = (
    <span
      title={isReference ? "Reference measurement" : `Measurement ${index + 1}`}
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-sm px-1 text-[9px] font-bold ${
        isReference
          ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]"
          : "bg-black/70 text-[var(--graphite-text-header)]"
      }`}
      style={{ left: pctX(spot.x), top: `calc(${pctY(spot.y)} - 10px)` }}
    >
      {isReference ? "★" : index + 1}
    </span>
  );

  const deleteButton = (leftPct: string, topPct: string) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      title="Delete this measurement"
      className="absolute z-10 flex h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-[9px] text-[var(--graphite-text-header)] hover:bg-red-600"
      style={{ left: leftPct, top: topPct }}
    >
      ✕
    </button>
  );

  if (spot.kind === "line" && spot.x2 != null && spot.y2 != null) {
    return (
      <>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <line
            x1={pctX(spot.x)}
            y1={pctY(spot.y)}
            x2={pctX(spot.x2)}
            y2={pctY(spot.y2)}
            stroke={selected ? "var(--graphite-primary)" : "white"}
            strokeWidth={selected ? 2 : 1.5}
          />
        </svg>
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelect();
            onLineEndStart(e, "start");
          }}
          title="Drag to move this end"
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border border-white bg-black/60"
          style={{ left: pctX(spot.x), top: pctY(spot.y) }}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelect();
            onLineEndStart(e, "end");
          }}
          title="Drag to move this end"
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border border-white bg-black/60"
          style={{ left: pctX(spot.x2), top: pctY(spot.y2) }}
        />
        {badge}
        {deleteButton(pctX(spot.x), pctY(spot.y))}
      </>
    );
  }

  if (spot.kind === "polygon" && Array.isArray(spot.points) && spot.points.length >= 3) {
    const pointsAttr = spot.points.map((p) => `${(p.x / gridWidth) * 100},${(p.y / gridHeight) * 100}`).join(" ");
    return (
      <>
        <svg
          className="absolute inset-0 h-full w-full cursor-move overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelect();
            onDragStart(e);
          }}
        >
          <polygon
            points={pointsAttr}
            fill={selected ? "color-mix(in srgb, var(--graphite-primary) 20%, transparent)" : "rgba(255,255,255,0.12)"}
            stroke={selected ? "var(--graphite-primary)" : "white"}
            strokeWidth={selected ? 0.6 : 0.4}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {badge}
        {deleteButton(pctX(spot.points[0].x), pctY(spot.points[0].y))}
      </>
    );
  }

  if (spot.kind === "area") {
    const w = spot.w ?? 20;
    const h = spot.h ?? 20;
    const left = spot.x - w / 2;
    const top = spot.y - h / 2;
    return (
      <>
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelect();
            onDragStart(e);
          }}
          title="Drag to move — grab the corner to resize"
          className={`absolute cursor-move border ${
            selected ? "border-[var(--graphite-primary)]" : "border-white/80"
          } ${spot.areaShape === "circle" ? "rounded-full" : ""}`}
          style={{ left: pctX(left), top: pctY(top), width: pctX(w), height: pctY(h) }}
        >
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelect();
              onResizeStart(e);
            }}
            title="Drag to resize"
            className="absolute -bottom-1 -right-1 h-2.5 w-2.5 cursor-nwse-resize rounded-sm border border-white bg-black/70"
          />
        </div>
        {badge}
        {deleteButton(pctX(spot.x + w / 2), pctY(spot.y - h / 2))}
      </>
    );
  }

  return (
    <>
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect();
          onDragStart(e);
        }}
        title="Drag to move"
        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move"
        style={{ left: pctX(spot.x), top: pctY(spot.y) }}
      >
        <span
          className={`block h-3 w-3 rounded-full border-2 ${
            selected ? "border-[var(--graphite-primary)]" : "border-white"
          }`}
        />
      </div>
      {badge}
      {deleteButton(`calc(${pctX(spot.x)} + 8px)`, `calc(${pctY(spot.y)} - 8px)`)}
    </>
  );
}
