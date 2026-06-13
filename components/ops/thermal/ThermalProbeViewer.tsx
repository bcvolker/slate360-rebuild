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
type MarkerShape = "circle" | "crosshair" | "box";

// ---- Color palettes (t: 0..1 -> [r,g,b]) ----
type Stops = Array<[number, number, number]>;
const PALETTES: Record<string, Stops> = {
  Inferno: [
    [0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99],
    [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164],
  ],
  Iron: [
    [0, 0, 0], [40, 0, 80], [120, 0, 90], [200, 30, 30],
    [245, 120, 0], [255, 200, 40], [255, 255, 200], [255, 255, 255],
  ],
  Rainbow: [
    [0, 0, 143], [0, 0, 255], [0, 255, 255], [120, 255, 0],
    [255, 255, 0], [255, 0, 0], [128, 0, 0],
  ],
  Grayscale: [
    [0, 0, 0], [255, 255, 255],
  ],
  Arctic: [
    [0, 0, 40], [0, 40, 120], [0, 120, 200], [120, 200, 255], [255, 255, 255],
  ],
  "Hot Metal": [
    [0, 0, 0], [120, 0, 0], [220, 80, 0], [255, 200, 0], [255, 255, 255],
  ],
};
const PALETTE_NAMES = Object.keys(PALETTES);

function sample(stops: Stops, t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[Math.min(stops.length - 1, i + 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function fmt(c: number, unit: Unit, withUnit = true): string {
  const v = unit === "F" ? (c * 9) / 5 + 32 : c;
  return `${v.toFixed(1)}${withUnit ? `°${unit}` : "°"}`;
}

function deltaFmt(deltaC: number, unit: Unit): string {
  const d = Math.abs(deltaC) * (unit === "F" ? 9 / 5 : 1);
  return `${d.toFixed(1)}°${unit}`;
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
  const [palette, setPalette] = useState<string>("Inferno");
  const [shape, setShape] = useState<MarkerShape>("circle");
  const [showLabels, setShowLabels] = useState(true);
  const [showMin, setShowMin] = useState(true);
  const [showMax, setShowMax] = useState(true);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [refId, setRefId] = useState<string | null>(null);
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

  const extremes = useMemo(() => {
    let hi = -Infinity, lo = Infinity, hiI = 0, loI = 0;
    for (let i = 0; i < temps.length; i++) {
      const v = temps[i];
      if (v > hi) { hi = v; hiI = i; }
      if (v < lo) { lo = v; loI = i; }
    }
    return {
      hot: { x: hiI % width, y: Math.floor(hiI / width), c: hi },
      cold: { x: loI % width, y: Math.floor(loI / width), c: lo },
    };
  }, [temps, width]);

  // Render heatmap with the selected palette.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stops = PALETTES[palette] ?? PALETTES.Inferno;
    const img = ctx.createImageData(width, height);
    const span = maxC - minC || 1;
    for (let i = 0; i < temps.length; i++) {
      const [r, g, b] = sample(stops, (temps[i] - minC) / span);
      const o = i * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [temps, width, height, minC, maxC, palette]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(width - 1, ((clientX - rect.left) / rect.width) * width)),
        y: Math.max(0, Math.min(height - 1, ((clientY - rect.top) / rect.height) * height)),
      };
    },
    [width, height],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = toImageCoords(e.clientX, e.clientY);
      setHover(p);
      const id = draggingRef.current;
      if (id) setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, x: p.x, y: p.y } : s)));
    },
    [toImageCoords],
  );

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const refSpot = spots.find((s) => s.id === refId) ?? spots[0] ?? null;
  const spotTemps = spots.map((s) => tempAt(s.x, s.y));
  const spread = spotTemps.length >= 2 ? Math.max(...spotTemps) - Math.min(...spotTemps) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{title ?? "Thermal probe"}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            className="rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-[var(--graphite-text-body)]"
            aria-label="Color palette"
          >
            {PALETTE_NAMES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as MarkerShape)}
            className="rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-[var(--graphite-text-body)]"
            aria-label="Marker shape"
          >
            <option value="circle">Circle target</option>
            <option value="crosshair">Crosshair</option>
            <option value="box">Box</option>
          </select>
          <Toggle on={unit === "F"} onClick={() => setUnit((u) => (u === "F" ? "C" : "F"))}>°{unit}</Toggle>
          <Toggle on={showLabels} onClick={() => setShowLabels((v) => !v)}>Labels</Toggle>
          <Toggle on={showMax} onClick={() => setShowMax((v) => !v)}>Max</Toggle>
          <Toggle on={showMin} onClick={() => setShowMin((v) => !v)}>Min</Toggle>
          {spots.length ? (
            <button
              type="button"
              onClick={() => { setSpots([]); setRefId(null); }}
              className="rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={wrapRef}
          className="relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-black"
          onPointerMove={onPointerMove}
          onPointerLeave={() => { setHover(null); draggingRef.current = null; }}
          onPointerUp={() => { draggingRef.current = null; }}
          onPointerDown={(e) => {
            const p = toImageCoords(e.clientX, e.clientY);
            const id = newSpotId();
            setSpots((prev) => [...prev, { id, x: p.x, y: p.y }]);
            if (!refId) setRefId(id);
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {showMax ? (
            <Marker shape={shape} tone="hot" label={showLabels ? `MAX ${fmt(extremes.hot.c, unit)}` : "MAX"}
              x={pct(extremes.hot.x, width)} y={pct(extremes.hot.y, height)} />
          ) : null}
          {showMin ? (
            <Marker shape={shape} tone="cold" label={showLabels ? `MIN ${fmt(extremes.cold.c, unit)}` : "MIN"}
              x={pct(extremes.cold.x, width)} y={pct(extremes.cold.y, height)} />
          ) : null}

          {hover && showLabels ? (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ left: pct(hover.x, width), top: pct(hover.y, height) }}
            >
              {fmt(tempAt(hover.x, hover.y), unit)}
            </div>
          ) : null}

          {spots.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: pct(s.x, width), top: pct(s.y, height) }}
              onPointerDown={(e) => { e.stopPropagation(); draggingRef.current = s.id; }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSpots((prev) => prev.filter((p) => p.id !== s.id));
                if (refId === s.id) setRefId(null);
              }}
              aria-label={`Spot ${idx + 1}`}
            >
              <SpotMarker shape={shape} index={idx + 1} active={s.id === refId} />
              {showLabels ? (
                <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold text-white">
                  {fmt(tempAt(s.x, s.y), unit)}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Frame</p>
            <p className="mt-1 text-[var(--graphite-text-body)]">Max {fmt(maxC, unit)} · Min {fmt(minC, unit)}</p>
            {grid.emissivity ? <p className="text-xs text-[var(--graphite-muted)]">Emissivity {grid.emissivity}</p> : null}
          </div>

          <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
              Spots ({spots.length})
            </p>
            {spots.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                Click the image to add a spot — add as many as you need. Drag to move, double-click to remove.
                Click a spot number below to set the Δ reference.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {spots.map((s, idx) => {
                  const tC = tempAt(s.x, s.y);
                  const dC = refSpot ? tC - tempAt(refSpot.x, refSpot.y) : 0;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-[var(--graphite-text-body)]">
                      <button
                        type="button"
                        onClick={() => setRefId(s.id)}
                        className="flex items-center gap-1.5"
                        title="Set as Δ reference"
                      >
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${s.id === refId ? "ring-2 ring-white bg-[var(--graphite-primary)]" : "bg-[var(--graphite-primary)]"}`}>
                          {idx + 1}
                        </span>
                      </button>
                      <span className="ml-auto font-semibold tabular-nums">{fmt(tC, unit)}</span>
                      {refSpot && s.id !== refSpot.id ? (
                        <span className="w-16 text-right text-xs tabular-nums text-[var(--graphite-muted)]">
                          Δ {deltaFmt(dC, unit)}
                        </span>
                      ) : (
                        <span className="w-16 text-right text-xs text-[var(--graphite-muted)]">ref</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {spots.length >= 2 ? (
              <div className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2 text-xs text-[var(--graphite-text-body)]">
                <div className="flex justify-between">
                  <span>Spread (max − min of spots)</span>
                  <span className="font-semibold tabular-nums">{deltaFmt(spread, unit)}</span>
                </div>
                <p className="mt-1 text-[var(--graphite-muted)]">
                  Δ column is each spot vs. the highlighted reference (Spot {spots.findIndex((s) => s.id === refSpot?.id) + 1}).
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
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

function SpotMarker({ shape, index, active }: { shape: MarkerShape; index: number; active: boolean }) {
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
  // circle target
  return (
    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[color-mix(in_srgb,var(--graphite-primary)_70%,transparent)] text-[8px] font-bold text-white ${ring}`}>
      <span className="absolute h-1 w-1 rounded-full bg-white" />
      {index}
    </span>
  );
}

function Marker({
  shape, x, y, tone, label,
}: { shape: MarkerShape; x: string; y: string; tone: "hot" | "cold"; label: string }) {
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
