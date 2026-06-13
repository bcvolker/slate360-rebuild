"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ThermalProbeGrid = {
  width: number;
  height: number;
  /** Row-major Celsius temperatures, length = width*height. */
  temps: number[] | Float32Array;
  minC: number;
  maxC: number;
  emissivity?: number;
};

type Spot = { id: string; x: number; y: number };

type Unit = "C" | "F";

// Inferno-style colormap stops (t: 0..1 -> [r,g,b]).
const STOPS: Array<[number, number, number]> = [
  [0, 0, 4],
  [40, 11, 84],
  [101, 21, 110],
  [159, 42, 99],
  [212, 72, 66],
  [245, 125, 21],
  [250, 193, 39],
  [252, 255, 164],
];

function colormap(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = STOPS[i];
  const b = STOPS[Math.min(STOPS.length - 1, i + 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function fmt(c: number, unit: Unit): string {
  const v = unit === "F" ? (c * 9) / 5 + 32 : c;
  return `${v.toFixed(1)}°${unit}`;
}

function newSpotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ThermalProbeViewer({ grid, title }: { grid: ThermalProbeGrid; title?: string }) {
  const { width, height, temps, minC, maxC } = grid;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState<Unit>("F");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef<string | null>(null);

  const tempAt = useCallback(
    (x: number, y: number): number => {
      const cx = Math.max(0, Math.min(width - 1, Math.round(x)));
      const cy = Math.max(0, Math.min(height - 1, Math.round(y)));
      return temps[cy * width + cx];
    },
    [temps, width, height],
  );

  // Auto hot/cold spot locations.
  const extremes = useMemo(() => {
    let hi = -Infinity;
    let lo = Infinity;
    let hiI = 0;
    let loI = 0;
    for (let i = 0; i < temps.length; i++) {
      const v = temps[i];
      if (v > hi) {
        hi = v;
        hiI = i;
      }
      if (v < lo) {
        lo = v;
        loI = i;
      }
    }
    return {
      hot: { x: hiI % width, y: Math.floor(hiI / width), c: hi },
      cold: { x: loI % width, y: Math.floor(loI / width), c: lo },
    };
  }, [temps, width]);

  // Render the heatmap to the canvas at native resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(width, height);
    const span = maxC - minC || 1;
    for (let i = 0; i < temps.length; i++) {
      const [r, g, b] = colormap((temps[i] - minC) / span);
      const o = i * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [temps, width, height, minC, maxC]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * width;
      const y = ((clientY - rect.top) / rect.height) * height;
      return { x: Math.max(0, Math.min(width - 1, x)), y: Math.max(0, Math.min(height - 1, y)) };
    },
    [width, height],
  );

  const addSpot = useCallback((x: number, y: number) => {
    setSpots((prev) => [...prev, { id: newSpotId(), x, y }]);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = toImageCoords(e.clientX, e.clientY);
      setHover(p);
      const id = draggingRef.current;
      if (id) {
        setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, x: p.x, y: p.y } : s)));
      }
    },
    [toImageCoords],
  );

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
          {title ?? "Thermal probe"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnit((u) => (u === "F" ? "C" : "F"))}
            className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-medium text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
          >
            °{unit}
          </button>
          {spots.length ? (
            <button
              type="button"
              onClick={() => setSpots([])}
              className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-medium text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              Clear spots
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={wrapRef}
          className="relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-black"
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setHover(null);
            draggingRef.current = null;
          }}
          onPointerUp={() => {
            draggingRef.current = null;
          }}
          onPointerDown={(e) => {
            const p = toImageCoords(e.clientX, e.clientY);
            addSpot(p.x, p.y);
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [image-rendering:auto]" />

          {/* Auto hot/cold markers */}
          <AutoMarker label="MAX" x={pct(extremes.hot.x, width)} y={pct(extremes.hot.y, height)} tone="hot" />
          <AutoMarker label="MIN" x={pct(extremes.cold.x, width)} y={pct(extremes.cold.y, height)} tone="cold" />

          {/* Hover readout */}
          {hover ? (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ left: pct(hover.x, width), top: pct(hover.y, height) }}
            >
              {fmt(tempAt(hover.x, hover.y), unit)}
            </div>
          ) : null}

          {/* User spots */}
          {spots.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
              style={{ left: pct(s.x, width), top: pct(s.y, height) }}
              onPointerDown={(e) => {
                e.stopPropagation();
                draggingRef.current = s.id;
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSpots((prev) => prev.filter((p) => p.id !== s.id));
              }}
              aria-label={`Spot ${idx + 1}`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[var(--graphite-primary)] text-[8px] font-bold text-white shadow">
                {idx + 1}
              </span>
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold text-white">
                {fmt(tempAt(s.x, s.y), unit)}
              </span>
            </button>
          ))}
        </div>

        {/* Readout panel */}
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Frame</p>
            <p className="mt-1 text-[var(--graphite-text-body)]">Max {fmt(maxC, unit)} · Min {fmt(minC, unit)}</p>
            {grid.emissivity ? (
              <p className="text-xs text-[var(--graphite-muted)]">Emissivity {grid.emissivity}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
              Spots ({spots.length})
            </p>
            {spots.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                Click the image to add a spot. Add as many as you need. Drag to move, double-click to remove.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {spots.map((s, idx) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-[var(--graphite-text-body)]">
                    <span className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-[var(--graphite-muted)]">
                        ({Math.round(s.x)}, {Math.round(s.y)})
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{fmt(tempAt(s.x, s.y), unit)}</span>
                  </li>
                ))}
              </ul>
            )}

            {spots.length >= 2 ? (
              <div className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
                  Differences (Δ)
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  {spots.slice(1).map((s, i) => {
                    const a = tempAt(spots[i].x, spots[i].y);
                    const b = tempAt(s.x, s.y);
                    const d = Math.abs(b - a) * (unit === "F" ? 9 / 5 : 1);
                    return (
                      <li key={s.id} className="flex justify-between tabular-nums text-[var(--graphite-text-body)]">
                        <span>
                          Spot {i + 1} → {i + 2}
                        </span>
                        <span className="font-semibold">
                          {d.toFixed(1)}°{unit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutoMarker({ label, x, y, tone }: { label: string; x: string; y: string; tone: "hot" | "cold" }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <span
        className={`flex h-3 w-3 items-center justify-center rounded-full border border-white ${
          tone === "hot" ? "bg-[#f5793f]" : "bg-[#3f8df5]"
        }`}
      />
      <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded bg-black/70 px-1 text-[8px] font-bold text-white">
        {label}
      </span>
    </div>
  );
}
