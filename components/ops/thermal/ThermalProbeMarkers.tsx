"use client";

import type { MarkerShape } from "@/lib/thermal/probe-palettes";

export function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2 py-1 font-medium transition-colors ${
        on
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
          : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

export function SpotMarker({
  shape,
  index,
  active,
}: {
  shape: MarkerShape;
  index: number;
  active: boolean;
}) {
  const ring = active ? "ring-2 ring-white" : "";
  if (shape === "crosshair") {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-5 w-px bg-white" />
        <span className="absolute h-px w-5 bg-white" />
        <span className={`absolute -right-3 -top-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-white ${ring}`}>{index}</span>
      </span>
    );
  }
  if (shape === "box") {
    return (
      <span className={`flex h-4 w-4 items-center justify-center border-2 border-white bg-[var(--graphite-primary)] text-[8px] font-bold text-white ${ring}`}>{index}</span>
    );
  }
  return (
    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[color-mix(in_srgb,var(--graphite-primary)_70%,transparent)] text-[8px] font-bold text-white ${ring}`}>
      <span className="absolute h-1 w-1 rounded-full bg-white" />
      {index}
    </span>
  );
}

/**
 * Precise point target — a thin crosshair (FLIR-style) with a centre gap, optionally
 * ringed. Replaces the old large round button so placement reads as exact.
 */
export function SpotTarget({
  shape,
  index,
  active,
}: {
  shape: "crosshair" | "crosshair-circle" | "dot" | "square";
  index: number;
  active: boolean;
}) {
  const line = "absolute bg-white shadow-[0_0_1px_rgba(0,0,0,0.9)]";
  const badge = (
    <span
      className={`absolute -right-3 -top-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-white ${
        active ? "ring-2 ring-white" : ""
      }`}
    >
      {index}
    </span>
  );

  if (shape === "dot") {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full border border-black/60 bg-white shadow-[0_0_1px_rgba(0,0,0,0.9)]" />
        {badge}
      </span>
    );
  }
  if (shape === "square") {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="h-3 w-3 border-2 border-white shadow-[0_0_1px_rgba(0,0,0,0.9)]" />
        {badge}
      </span>
    );
  }
  // crosshair / crosshair-circle
  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      <span className={`${line} left-1/2 top-0 h-2 w-px -translate-x-1/2`} />
      <span className={`${line} left-1/2 bottom-0 h-2 w-px -translate-x-1/2`} />
      <span className={`${line} top-1/2 left-0 h-px w-2 -translate-y-1/2`} />
      <span className={`${line} top-1/2 right-0 h-px w-2 -translate-y-1/2`} />
      {shape === "crosshair-circle" ? (
        <span className="absolute h-4 w-4 rounded-full border border-white/90 shadow-[0_0_1px_rgba(0,0,0,0.9)]" />
      ) : null}
      {badge}
    </span>
  );
}

export function ExtremeMarker({
  shape,
  x,
  y,
  tone,
  label,
}: {
  shape: MarkerShape;
  x: string;
  y: string;
  tone: "hot" | "cold";
  label: string;
}) {
  const color = tone === "hot" ? "#f5793f" : "#3f8df5";
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      {shape === "crosshair" ? (
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute h-4 w-px" style={{ background: color }} />
          <span className="absolute h-px w-4" style={{ background: color }} />
        </span>
      ) : shape === "box" ? (
        <span className="block h-3 w-3 border-2" style={{ borderColor: color }} />
      ) : (
        <span className="block h-3 w-3 rounded-full border-2 border-white" style={{ background: color }} />
      )}
      <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 text-[8px] font-bold text-white">
        {label}
      </span>
    </div>
  );
}
