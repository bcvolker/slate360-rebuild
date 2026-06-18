"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  renderHeatmap,
  fmtTemp,
  newSpotId,
  type MarkerShape,
  type Unit,
} from "@/lib/thermal/probe-palettes";
import { SpotMarker, ExtremeMarker } from "@/components/ops/thermal/ThermalProbeMarkers";
import { ThermalProbeToolbar } from "@/components/ops/thermal/ThermalProbeToolbar";
import { ThermalAnomalyOverlay } from "@/components/ops/thermal/ThermalAnomalyOverlay";
import { ThermalFindingsPanel } from "@/components/ops/thermal/ThermalFindingsPanel";
import { ThermalSpotsPanel } from "@/components/ops/thermal/ThermalSpotsPanel";
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

export type ProbeSpot = { id: string; x: number; y: number; imported?: boolean };
export type ProbeTuning = { emissivity: number; reflected_c: number };

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
}: Props) {
  const { width, height } = grid;
  const baseEmissivity = grid.emissivity ?? 0.95;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [emissivity, setEmissivity] = useState(initialTuning?.emissivity ?? baseEmissivity);
  const [reflectedC, setReflectedC] = useState(initialTuning?.reflected_c ?? 20);

  useEffect(() => {
    setEmissivity(initialTuning?.emissivity ?? baseEmissivity);
    setReflectedC(initialTuning?.reflected_c ?? 20);
  }, [initialTuning?.emissivity, initialTuning?.reflected_c, baseEmissivity]);

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
      onTuningChange?.({ emissivity: e1, reflected_c: refl });
    },
    [onTuningChange],
  );

  const [unit, setUnit] = useState<Unit>("F");
  const [palette, setPalette] = useState<string>("Inferno");
  const [shape, setShape] = useState<MarkerShape>("circle");
  const [showLabels, setShowLabels] = useState(true);
  const [showMin, setShowMin] = useState(true);
  const [showMax, setShowMax] = useState(true);
  const [showFindings, setShowFindings] = useState(true);
  const [spots, setSpots] = useState<ProbeSpot[]>(initialSpots ?? []);
  const [refId, setRefId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [displayMin, setDisplayMin] = useState<number | null>(null);
  const [displayMax, setDisplayMax] = useState<number | null>(null);
  const draggingRef = useRef<string | null>(null);

  useEffect(() => setSpots(initialSpots ?? []), [initialSpots]);
  // Reset the manual display range (span/level) when the capture changes.
  useEffect(() => { setDisplayMin(null); setDisplayMax(null); }, [grid.temps]);

  const loDisp = displayMin ?? minC;
  const hiDisp = displayMax ?? maxC;

  // Persist spots after committed changes (add/delete/drag-end/clear), not hover.
  const commit = useCallback(
    (next: ProbeSpot[]) => {
      setSpots(next);
      onSpotsChange?.(next);
    },
    [onSpotsChange],
  );

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
    renderHeatmap(ctx, temps, width, height, palette, loDisp, hiDisp);
  }, [temps, width, height, loDisp, hiDisp, palette]);

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
  const importedCount = spots.filter((s) => s.imported).length;

  return (
    <div className="space-y-3">
      <ThermalProbeToolbar
        title={title}
        palette={palette}
        setPalette={setPalette}
        shape={shape}
        setShape={setShape}
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
        importedCount={importedCount}
        onClearBaked={() => commit(spots.filter((s) => !s.imported))}
        spotCount={spots.length}
        onClearSpots={() => { commit([]); setRefId(null); }}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={wrapRef}
          className="relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-black"
          onPointerMove={onPointerMove}
          onPointerLeave={() => { setHover(null); draggingRef.current = null; }}
          onPointerUp={() => { if (draggingRef.current) { draggingRef.current = null; onSpotsChange?.(spots); } }}
          onPointerDown={(e) => {
            const p = toImageCoords(e.clientX, e.clientY);
            const id = newSpotId();
            commit([...spots, { id, x: p.x, y: p.y }]);
            if (!refId) setRefId(id);
          }}
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
            <ExtremeMarker shape={shape} tone="hot" label={showLabels ? `MAX ${fmtTemp(extremes.hot.c, unit)}` : "MAX"}
              x={pct(extremes.hot.x, width)} y={pct(extremes.hot.y, height)} />
          ) : null}
          {showMin ? (
            <ExtremeMarker shape={shape} tone="cold" label={showLabels ? `MIN ${fmtTemp(extremes.cold.c, unit)}` : "MIN"}
              x={pct(extremes.cold.x, width)} y={pct(extremes.cold.y, height)} />
          ) : null}

          {hover && showLabels ? (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ left: pct(hover.x, width), top: pct(hover.y, height) }}
            >
              {fmtTemp(tempAt(hover.x, hover.y), unit)}
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
                commit(spots.filter((p) => p.id !== s.id));
                if (refId === s.id) setRefId(null);
              }}
              aria-label={`Spot ${idx + 1}`}
            >
              <SpotMarker shape={shape} index={idx + 1} active={s.id === refId} />
              {showLabels ? (
                <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold text-white">
                  {fmtTemp(tempAt(s.x, s.y), unit)}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="space-y-3 text-sm">
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
          />
          <ThermalFindingsPanel
            anomalies={anomalies}
            standards={standards}
            unit={unit}
            selectedId={selectedAnomalyId}
            onSelect={setSelectedAnomalyId}
          />
          <ThermalSpotsPanel spots={spots} refId={refId} setRefId={setRefId} unit={unit} tempAt={tempAt} />
        </div>
      </div>
    </div>
  );
}
