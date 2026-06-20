"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  renderHeatmap,
  computeHistogram,
  samplePalette,
  fmtTemp,
  newSpotId,
  type MarkerShape,
  type Unit,
} from "@/lib/thermal/probe-palettes";
import { SpotTarget, ExtremeMarker } from "@/components/ops/thermal/ThermalProbeMarkers";
import { spotStats } from "@/lib/thermal/spot-stats";
import { ThermalProbeToolbar } from "@/components/ops/thermal/ThermalProbeToolbar";
import { ThermalAnomalyOverlay } from "@/components/ops/thermal/ThermalAnomalyOverlay";
import { ThermalFindingsPanel } from "@/components/ops/thermal/ThermalFindingsPanel";
import { ThermalSpotsPanel } from "@/components/ops/thermal/ThermalSpotsPanel";
import { CollapsibleSection } from "@/components/ops/thermal/CollapsibleSection";
import { ThermalImageTuning } from "@/components/ops/thermal/ThermalImageTuning";
import { tuneTemps } from "@/lib/thermal/radiometric";
import type { ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

export type ThermalProbeGrid = {
  width: number;
  height: number;
  /** Row-major Celsius temperatures, length = width*height. */
  temps: number[] | Float32Array;
  minC: number;
  maxC: number;
  emissivity?: number;
};

/** A measurement target: a point marker, an averaging area (box/ellipse), or a line. */
export type SpotKind = "point" | "area" | "line";
export type SpotTargetShape = "crosshair" | "crosshair-circle" | "dot" | "square";
export type SpotAreaShape = "box" | "circle";
export type ProbeSpot = {
  id: string;
  x: number;
  y: number;
  imported?: boolean;
  kind?: SpotKind; // default "point"
  target?: SpotTargetShape; // point look — default "crosshair"
  areaShape?: SpotAreaShape; // area look — default "box"
  /** Area size in grid pixels (when kind === "area"). */
  w?: number;
  h?: number;
  /** Line end point in grid pixels (when kind === "line"); start is x,y. */
  x2?: number;
  y2?: number;
};
export type ProbeTuning = {
  emissivity: number;
  reflected_c: number;
  distance_m?: number;
  humidity_pct?: number;
  atmospheric_c?: number;
};

type Props = {
  grid: ThermalProbeGrid;
  title?: string;
  anomalies?: ThermalAnomaly[];
  /** Standards from the active report template (drives finding descriptions). */
  standards?: string[];
  initialSpots?: ProbeSpot[];
  /** Persist user spots (fired after changes, excluding hover). */
  onSpotsChange?: (spots: ProbeSpot[]) => void;
  initialTuning?: ProbeTuning | null;
  /** Persist per-image emissivity / reflected-temp tuning. */
  onTuningChange?: (tuning: ProbeTuning) => void;
  /** Per-image palette (display) — seed + persist. */
  initialPalette?: string | null;
  onPaletteChange?: (palette: string) => void;
  /** Extra panels rendered in the right data rail (e.g. photo metadata + findings editor). */
  extraPanels?: ReactNode;
};

export function ThermalProbeViewer({
  grid,
  title,
  anomalies = [],
  standards,
  initialSpots,
  onSpotsChange,
  initialTuning,
  onTuningChange,
  initialPalette,
  onPaletteChange,
  extraPanels,
}: Props) {
  const { width, height } = grid;
  const baseEmissivity = grid.emissivity ?? 0.95;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  // Largest aspect-correct image size that fits the center cell (measured, since
  // flex + CSS aspect-ratio doesn't size reliably).
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);

  const [emissivity, setEmissivity] = useState(initialTuning?.emissivity ?? baseEmissivity);
  const [reflectedC, setReflectedC] = useState(initialTuning?.reflected_c ?? 20);
  const [distanceM, setDistanceM] = useState<number | undefined>(initialTuning?.distance_m);
  const [humidityPct, setHumidityPct] = useState<number | undefined>(initialTuning?.humidity_pct);
  const [atmosphericC, setAtmosphericC] = useState<number | undefined>(initialTuning?.atmospheric_c);

  useEffect(() => {
    setEmissivity(initialTuning?.emissivity ?? baseEmissivity);
    setReflectedC(initialTuning?.reflected_c ?? 20);
    setDistanceM(initialTuning?.distance_m);
    setHumidityPct(initialTuning?.humidity_pct);
    setAtmosphericC(initialTuning?.atmospheric_c);
  }, [
    initialTuning?.emissivity,
    initialTuning?.reflected_c,
    initialTuning?.distance_m,
    initialTuning?.humidity_pct,
    initialTuning?.atmospheric_c,
    baseEmissivity,
  ]);

  // Live gray-body recompute when emissivity / reflected temp change.
  const tuned = useMemo(
    () => tuneTemps(grid.temps, grid.minC, grid.maxC, baseEmissivity, emissivity, reflectedC),
    [grid.temps, grid.minC, grid.maxC, baseEmissivity, emissivity, reflectedC],
  );
  const temps = tuned.temps;
  const minC = tuned.minC;
  const maxC = tuned.maxC;

  const applyTuning = useCallback(
    (e1: number, refl: number) => {
      setEmissivity(e1);
      setReflectedC(refl);
      onTuningChange?.({
        emissivity: e1,
        reflected_c: refl,
        distance_m: distanceM,
        humidity_pct: humidityPct,
        atmospheric_c: atmosphericC,
      });
    },
    [onTuningChange, distanceM, humidityPct, atmosphericC],
  );

  // Display-only environment params (don't affect the gray-body preview, but are
  // captured for the report). Persisted alongside emissivity/reflected.
  const applyParam = useCallback(
    (patch: Partial<Pick<ProbeTuning, "distance_m" | "humidity_pct" | "atmospheric_c">>) => {
      const next = {
        distance_m: distanceM,
        humidity_pct: humidityPct,
        atmospheric_c: atmosphericC,
        ...patch,
      };
      setDistanceM(next.distance_m);
      setHumidityPct(next.humidity_pct);
      setAtmosphericC(next.atmospheric_c);
      onTuningChange?.({ emissivity, reflected_c: reflectedC, ...next });
    },
    [onTuningChange, emissivity, reflectedC, distanceM, humidityPct, atmosphericC],
  );

  const [unit, setUnit] = useState<Unit>("F");
  const [palette, setPaletteState] = useState<string>(initialPalette || "Inferno");
  const setPalette = useCallback(
    (p: string) => { setPaletteState(p); onPaletteChange?.(p); },
    [onPaletteChange],
  );
  useEffect(() => { setPaletteState(initialPalette || "Inferno"); }, [initialPalette]);
  // What the next click places (point markers or averaging areas).
  const [tool, setTool] = useState<
    "crosshair" | "crosshair-circle" | "dot" | "square" | "area" | "area-circle" | "line"
  >("crosshair");
  const [showLabels, setShowLabels] = useState(true);
  const [showMin, setShowMin] = useState(true);
  const [showMax, setShowMax] = useState(true);
  const [showFindings, setShowFindings] = useState(true);
  const [showLoupe, setShowLoupe] = useState(true);
  // Zoom/pan of the image work area, and collapsible side rails.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showRightRail, setShowRightRail] = useState(true);
  const panningRef = useRef<{ x: number; y: number } | null>(null);
  const [spots, setSpots] = useState<ProbeSpot[]>(initialSpots ?? []);
  const [refId, setRefId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [displayMin, setDisplayMin] = useState<number | null>(null);
  const [displayMax, setDisplayMax] = useState<number | null>(null);
  const [isoOn, setIsoOn] = useState(false);
  const [isoLo, setIsoLo] = useState<number | null>(null);
  const [isoHi, setIsoHi] = useState<number | null>(null);
  const draggingRef = useRef<string | null>(null);
  const resizingRef = useRef<string | null>(null);
  const lineEndRef = useRef<{ id: string; part: "start" | "end" } | null>(null);
  const dragSnapshot = useRef<ProbeSpot[] | null>(null);
  // Undo/redo history of the spot set (the main editable in this view).
  const [past, setPast] = useState<ProbeSpot[][]>([]);
  const [future, setFuture] = useState<ProbeSpot[][]>([]);

  useEffect(() => setSpots(initialSpots ?? []), [initialSpots]);
  // Reset manual display range + isotherm when the capture changes.
  useEffect(() => {
    setDisplayMin(null);
    setDisplayMax(null);
    setIsoOn(false);
    setIsoLo(null);
    setIsoHi(null);
    setPast([]);
    setFuture([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [grid.temps]);

  const setZoomAt = useCallback(
    (nextZoom: number, lx: number, ly: number) => {
      const nz = Math.max(1, Math.min(8, nextZoom));
      setPan((p) => (nz === 1 ? { x: 0, y: 0 } : { x: lx - (lx - p.x) * (nz / zoom), y: ly - (ly - p.y) * (nz / zoom) }));
      setZoom(nz);
    },
    [zoom],
  );
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setZoomAt(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - rect.left, e.clientY - rect.top);
    },
    [zoom, setZoomAt],
  );
  function zoomButton(dir: 1 | -1) {
    const el = wrapRef.current;
    const rect = el?.getBoundingClientRect();
    setZoomAt(zoom * (dir > 0 ? 1.25 : 1 / 1.25), (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
  }
  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // Measure the center cell and fit the image (aspect-correct) into it.
  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      const aspect = width / height;
      const w = cw / ch > aspect ? ch * aspect : cw;
      const h = cw / ch > aspect ? ch : cw / aspect;
      setFit({ w: Math.floor(w), h: Math.floor(h) });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, showRightRail]);

  const loDisp = displayMin ?? minC;
  const hiDisp = displayMax ?? maxC;
  // Default isotherm band = upper third of the display range (typical "hot" focus).
  const isoLoVal = isoLo ?? loDisp + (hiDisp - loDisp) * 0.66;
  const isoHiVal = isoHi ?? hiDisp;
  const histogram = useMemo(
    () => computeHistogram(temps, loDisp, hiDisp, 40),
    [temps, loDisp, hiDisp],
  );

  // Persist spots after committed changes (add/delete/drag-end/clear), not hover.
  // Each commit records history so edits can be undone/redone.
  const commit = useCallback(
    (next: ProbeSpot[]) => {
      setPast((p) => [...p, spots]);
      setFuture([]);
      setSpots(next);
      onSpotsChange?.(next);
    },
    [onSpotsChange, spots],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [spots, ...f]);
      setSpots(prev);
      onSpotsChange?.(prev);
      return p.slice(0, -1);
    });
  }, [spots, onSpotsChange]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const nextState = f[0];
      setPast((p) => [...p, spots]);
      setSpots(nextState);
      onSpotsChange?.(nextState);
      return f.slice(1);
    });
  }, [spots, onSpotsChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderHeatmap(
      ctx,
      temps,
      width,
      height,
      palette,
      loDisp,
      hiDisp,
      isoOn ? { lo: isoLoVal, hi: isoHiVal } : null,
    );
  }, [temps, width, height, loDisp, hiDisp, palette, isoOn, isoLoVal, isoHiVal]);

  // Magnifier loupe: a zoomed window of pixels around the cursor for pixel-precise
  // probing. Draws an LOUPE_SPAN×LOUPE_SPAN grid scaled up, with a centre cell.
  const LOUPE_PX = 104;
  const LOUPE_SPAN = 13;
  useEffect(() => {
    const c = loupeRef.current;
    if (!c || !hover) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const half = Math.floor(LOUPE_SPAN / 2);
    const cell = LOUPE_PX / LOUPE_SPAN;
    const cx = Math.round(hover.x);
    const cy = Math.round(hover.y);
    const span = hiDisp - loDisp || 1;
    for (let j = 0; j < LOUPE_SPAN; j++) {
      for (let i = 0; i < LOUPE_SPAN; i++) {
        const px = cx - half + i;
        const py = cy - half + j;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const [r, g, b] = samplePalette(palette, (temps[py * width + px] - loDisp) / span);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          ctx.fillStyle = "#000";
        }
        ctx.fillRect(Math.floor(i * cell), Math.floor(j * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(half * cell, half * cell, cell, cell);
  }, [hover, temps, width, height, palette, loDisp, hiDisp]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      // Undo the zoom/pan transform of the image layer, then map to grid pixels.
      const layerX = (clientX - rect.left - pan.x) / zoom;
      const layerY = (clientY - rect.top - pan.y) / zoom;
      return {
        x: Math.max(0, Math.min(width - 1, (layerX / rect.width) * width)),
        y: Math.max(0, Math.min(height - 1, (layerY / rect.height) * height)),
      };
    },
    [width, height, pan, zoom],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panningRef.current) {
        setPan({ x: e.clientX - panningRef.current.x, y: e.clientY - panningRef.current.y });
        return;
      }
      const p = toImageCoords(e.clientX, e.clientY);
      setHover(p);
      const le = lineEndRef.current;
      if (le) {
        setSpots((prev) =>
          prev.map((s) => (s.id === le.id ? (le.part === "end" ? { ...s, x2: p.x, y2: p.y } : { ...s, x: p.x, y: p.y }) : s)),
        );
        return;
      }
      const id = draggingRef.current;
      if (id) {
        // Move whole target (lines move both endpoints by the same delta).
        setSpots((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            if (s.kind === "line" && s.x2 != null && s.y2 != null) {
              const ddx = p.x - s.x;
              const ddy = p.y - s.y;
              return { ...s, x: p.x, y: p.y, x2: s.x2 + ddx, y2: s.y2 + ddy };
            }
            return { ...s, x: p.x, y: p.y };
          }),
        );
        return;
      }
      const rid = resizingRef.current;
      if (rid) {
        setSpots((prev) =>
          prev.map((s) =>
            s.id === rid
              ? { ...s, w: Math.max(4, Math.abs(p.x - s.x) * 2), h: Math.max(4, Math.abs(p.y - s.y) * 2) }
              : s,
          ),
        );
      }
    },
    [toImageCoords],
  );

  // End a move/resize gesture: record the pre-gesture state in history once.
  const endGesture = useCallback(() => {
    if ((draggingRef.current || resizingRef.current || lineEndRef.current) && dragSnapshot.current) {
      const snapshot = dragSnapshot.current;
      setPast((p) => [...p, snapshot]);
      setFuture([]);
      onSpotsChange?.(spots);
    }
    draggingRef.current = null;
    resizingRef.current = null;
    lineEndRef.current = null;
    dragSnapshot.current = null;
  }, [spots, onSpotsChange]);

  function placeSpot(p: { x: number; y: number }) {
    const id = newSpotId();
    const aw = Math.max(12, width * 0.18);
    const ah = Math.max(12, height * 0.18);
    let base: ProbeSpot;
    if (tool === "area" || tool === "area-circle") {
      base = { id, x: p.x, y: p.y, kind: "area", areaShape: tool === "area-circle" ? "circle" : "box", w: aw, h: ah };
    } else if (tool === "line") {
      base = { id, x: p.x, y: p.y, kind: "line", x2: Math.min(width - 1, p.x + aw), y2: p.y };
    } else {
      base = { id, x: p.x, y: p.y, kind: "point", target: tool };
    }
    commit([...spots, base]);
    if (!refId) setRefId(id);
  }

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const importedCount = spots.filter((s) => s.imported).length;

  const toolsRail = (
    <ThermalImageTuning
      emissivity={emissivity}
      reflectedC={reflectedC}
      baseEmissivity={baseEmissivity}
      onEmissivity={(v) => applyTuning(v, reflectedC)}
      onReflected={(v) => applyTuning(emissivity, v)}
      onReset={() => applyTuning(baseEmissivity, 20)}
      unit={unit}
      dataMin={minC}
      dataMax={maxC}
      rangeMin={loDisp}
      rangeMax={hiDisp}
      rangeManual={displayMin !== null || displayMax !== null}
      onRangeMin={setDisplayMin}
      onRangeMax={setDisplayMax}
      onRangeAuto={() => { setDisplayMin(null); setDisplayMax(null); }}
      histogram={histogram}
      distanceM={distanceM}
      humidityPct={humidityPct}
      atmosphericC={atmosphericC}
      onDistanceM={(v) => applyParam({ distance_m: v })}
      onHumidityPct={(v) => applyParam({ humidity_pct: v })}
      onAtmosphericC={(v) => applyParam({ atmospheric_c: v })}
      isoOn={isoOn}
      isoLo={isoLoVal}
      isoHi={isoHiVal}
      onIsoToggle={() => setIsoOn((v) => !v)}
      onIsoLo={setIsoLo}
      onIsoHi={setIsoHi}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0">
      <ThermalProbeToolbar
        title={title}
        palette={palette}
        setPalette={setPalette}
        tool={tool}
        setTool={setTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        unit={unit}
        setUnit={setUnit}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        showMax={showMax}
        setShowMax={setShowMax}
        showMin={showMin}
        setShowMin={setShowMin}
        hasAnomalies={anomalies.length > 0}
        showFindings={showFindings}
        setShowFindings={setShowFindings}
        showLoupe={showLoupe}
        setShowLoupe={setShowLoupe}
        showRightRail={showRightRail}
        setShowRightRail={setShowRightRail}
        importedCount={importedCount}
        onClearBaked={() => commit(spots.filter((s) => !s.imported))}
        spotCount={spots.length}
        onClearSpots={() => { commit([]); setRefId(null); }}
      />
      </div>

      {/* Flex body (NOT grid — a grid's implicit row is auto-sized and collapses the
          viewer to content height). Center is flex-1 min-w-0 and dominates; the right
          rail holds collapsible sections so everything fits without page scroll. */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Center: the thermal image as a large, aspect-correct work area (zoom + pan).
            Size is measured (ResizeObserver) so the image always fills the cell. */}
        <div ref={centerRef} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
        <div
          ref={wrapRef}
          style={fit ? { width: fit.w, height: fit.h } : { width: 0, height: 0 }}
          className="relative cursor-crosshair touch-none overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-black"
          onWheel={onWheel}
          onPointerMove={onPointerMove}
          onPointerLeave={() => { setHover(null); endGesture(); panningRef.current = null; }}
          onPointerUp={() => { endGesture(); panningRef.current = null; }}
          onPointerDown={(e) => {
            if (e.button === 1) { e.preventDefault(); panningRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; return; }
            placeSpot(toImageCoords(e.clientX, e.clientY));
          }}
        >
          <div
            className="absolute inset-0"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {showFindings ? (
            <ThermalAnomalyOverlay
              anomalies={anomalies}
              width={width}
              height={height}
              selectedId={selectedAnomalyId}
              onSelect={setSelectedAnomalyId}
            />
          ) : null}

          {showMax ? (
            <ExtremeMarker shape="crosshair" tone="hot" label={showLabels ? `MAX ${fmtTemp(extremes.hot.c, unit)}` : "MAX"}
              x={pct(extremes.hot.x, width)} y={pct(extremes.hot.y, height)} />
          ) : null}
          {showMin ? (
            <ExtremeMarker shape="crosshair" tone="cold" label={showLabels ? `MIN ${fmtTemp(extremes.cold.c, unit)}` : "MIN"}
              x={pct(extremes.cold.x, width)} y={pct(extremes.cold.y, height)} />
          ) : null}

          {spots.map((s, idx) => {
            const stats = spotStats(s, temps, width, height);
            const startDrag = (e: React.PointerEvent) => {
              e.stopPropagation();
              dragSnapshot.current = spots;
              draggingRef.current = s.id;
            };
            const remove = (e: React.MouseEvent) => {
              e.stopPropagation();
              commit(spots.filter((p) => p.id !== s.id));
              if (refId === s.id) setRefId(null);
            };
            const label = showLabels ? (
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold text-white">
                {s.kind === "area" ? "avg " : ""}{fmtTemp(stats.value, unit)}
              </span>
            ) : null;

            if (s.kind === "line" && s.x2 != null && s.y2 != null) {
              const midX = (s.x + s.x2) / 2;
              const midY = (s.y + s.y2) / 2;
              const handle =
                "absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-black/60 bg-white shadow-[0_0_1px_rgba(0,0,0,0.9)]";
              return (
                <div key={s.id} className="pointer-events-none absolute inset-0">
                  <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <line x1={s.x} y1={s.y} x2={s.x2} y2={s.y2} stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  </svg>
                  {/* endpoints */}
                  <span className={`${handle} pointer-events-auto`} style={{ left: pct(s.x, width), top: pct(s.y, height) }}
                    onPointerDown={(e) => { e.stopPropagation(); dragSnapshot.current = spots; lineEndRef.current = { id: s.id, part: "start" }; }} />
                  <span className={`${handle} pointer-events-auto`} style={{ left: pct(s.x2, width), top: pct(s.y2, height) }}
                    onPointerDown={(e) => { e.stopPropagation(); dragSnapshot.current = spots; lineEndRef.current = { id: s.id, part: "end" }; }} />
                  {/* move handle + label at midpoint */}
                  <button type="button"
                    className="pointer-events-auto absolute z-20 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-white"
                    style={{ left: pct(midX, width), top: pct(midY, height) }}
                    onPointerDown={startDrag}
                    onDoubleClick={remove}
                    aria-label={`Line ${idx + 1}`}
                  >{idx + 1}</button>
                  {showLabels ? (
                    <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-[160%] whitespace-nowrap rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold text-white"
                      style={{ left: pct(midX, width), top: pct(midY, height) }}>
                      avg {fmtTemp(stats.value, unit)}{stats.max != null ? ` · max ${fmtTemp(stats.max, unit)}` : ""}
                    </span>
                  ) : null}
                </div>
              );
            }

            if (s.kind === "area") {
              return (
                <div
                  key={s.id}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pct(s.x, width), top: pct(s.y, height), width: pct(s.w ?? 20, width), height: pct(s.h ?? 20, height) }}
                  onPointerDown={startDrag}
                  onDoubleClick={remove}
                  aria-label={`Area ${idx + 1}`}
                >
                  <div className={`h-full w-full border-2 ${s.areaShape === "circle" ? "rounded-full" : ""} ${s.id === refId ? "border-white" : "border-white/80"} bg-white/5 shadow-[0_0_1px_rgba(0,0,0,0.9)]`} />
                  <span className="absolute -left-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-white">{idx + 1}</span>
                  {/* resize handle (bottom-right) */}
                  <span
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-[var(--graphite-primary)]"
                    onPointerDown={(e) => { e.stopPropagation(); dragSnapshot.current = spots; resizingRef.current = s.id; }}
                  />
                  {label}
                </div>
              );
            }

            return (
              <button
                key={s.id}
                type="button"
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: pct(s.x, width), top: pct(s.y, height) }}
                onPointerDown={startDrag}
                onDoubleClick={remove}
                aria-label={`Spot ${idx + 1}`}
              >
                <SpotTarget shape={s.target ?? "crosshair"} index={idx + 1} active={s.id === refId} />
                {label}
              </button>
            );
          })}
          </div>{/* end transform layer */}

          {/* Magnifier loupe (fixed overlay — not affected by zoom/pan) */}
          {hover && showLoupe ? (
            <div className="pointer-events-none absolute right-2 top-2 z-30 rounded-lg border border-white/40 bg-black/70 p-1 text-center">
              <canvas ref={loupeRef} width={LOUPE_PX} height={LOUPE_PX} className="block rounded" style={{ imageRendering: "pixelated" }} />
              <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-white">
                {fmtTemp(tempAt(hover.x, hover.y), unit)} · x{Math.round(hover.x)} y{Math.round(hover.y)}
              </p>
            </div>
          ) : null}

          {/* Zoom control (scroll wheel zooms toward cursor; middle-drag pans) */}
          <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 rounded-lg border border-white/30 bg-black/70 px-1 py-0.5 text-[11px] text-white">
            <button type="button" onClick={() => zoomButton(-1)} className="px-1.5 font-bold" title="Zoom out">−</button>
            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => zoomButton(1)} className="px-1.5 font-bold" title="Zoom in">+</button>
            <button type="button" onClick={resetZoom} className="px-1.5" title="Reset zoom">⟲</button>
          </div>
        </div>{/* end image wrap */}
        </div>{/* end center */}

        {/* Right rail: collapsible sections (Tuning / Measurements / Findings / Image
            data) so everything fits with no page scroll; the rail scrolls internally. */}
        {showRightRail ? (
        <div className="w-72 shrink-0 min-h-0 space-y-2 overflow-y-auto pr-1 text-sm">
          <CollapsibleSection title="Tuning &amp; palette">{toolsRail}</CollapsibleSection>
          <CollapsibleSection title="Measurements" badge={spots.length}>
            <ThermalSpotsPanel
              spots={spots}
              refId={refId}
              setRefId={setRefId}
              unit={unit}
              valueOf={(s) => spotStats(s, temps, width, height).value}
            />
          </CollapsibleSection>
          <CollapsibleSection title="Findings" badge={anomalies.length}>
            <ThermalFindingsPanel
              anomalies={anomalies}
              standards={standards}
              unit={unit}
              selectedId={selectedAnomalyId}
              onSelect={setSelectedAnomalyId}
            />
          </CollapsibleSection>
          {extraPanels ? <CollapsibleSection title="Image data" defaultOpen={false}>{extraPanels}</CollapsibleSection> : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}
