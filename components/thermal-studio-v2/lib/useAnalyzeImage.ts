"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUndoRedo } from "@/components/site-walk/canvas/useUndoRedo";
import { tuneTemps } from "@/lib/thermal/radiometric";
import { newSpotId } from "@/lib/thermal/probe-palettes";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { saveSpots } from "@/components/thermal-studio-v2/lib/spots-api";
import { saveTuning } from "@/components/thermal-studio-v2/lib/tuning-api";
import type {
  ThermalV2Capture,
  ThermalV2Isotherm,
  ThermalV2Spot,
  ThermalV2Tool,
  ThermalV2Tuning,
} from "@/components/thermal-studio-v2/types";

const DEFAULT_TUNING: ThermalV2Tuning = { emissivity: 0.95, reflected_c: 20 };

function extremeIndex(temps: number[], kind: "max" | "min"): number {
  let best = 0;
  for (let i = 1; i < temps.length; i++) {
    if (kind === "max" ? temps[i] > temps[best] : temps[i] < temps[best]) best = i;
  }
  return best;
}

/**
 * Owns everything the Analyze tab needs for the ACTIVE image: grid fetch,
 * live tuning recompute (client-side gray-body path, never a server round
 * trip — doc §1b.2), display span/isotherm, and the measurement history
 * (undo/redo + autosave). Lifted out of the viewer so the Measurements/
 * Tuning/Display right rail can all share the same state.
 */
export function useAnalyzeImage(activeCapture: ThermalV2Capture | null) {
  const captureId = activeCapture?.id ?? null;
  const [rawGrid, setRawGrid] = useState<ThermalV2Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [span, setSpanState] = useState<{ lo: number; hi: number } | null>(null);
  const [spanCustomized, setSpanCustomized] = useState(false);
  const [isotherm, setIsotherm] = useState<ThermalV2Isotherm>(null);
  const [tuning, setTuning] = useState<ThermalV2Tuning>(DEFAULT_TUNING);
  const [tool, setTool] = useState<ThermalV2Tool>("move");
  const [areaShape, setAreaShape] = useState<"box" | "circle">("box");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const history = useUndoRedo<ThermalV2Spot[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;

  const baseEmissivity = rawGrid?.emissivity ?? 0.95;

  useEffect(() => {
    setRawGrid(null);
    setSpanState(null);
    setSpanCustomized(false);
    setIsotherm(null);
    setError(null);
    setSelectedId(null);
    setReferenceId(null);
    const meta = (activeCapture?.metadata ?? null) as Record<string, unknown> | null;
    const seededSpots = meta?.spots;
    history.reset(Array.isArray(seededSpots) ? (seededSpots as ThermalV2Spot[]) : []);
    const seededTuning = meta?.tuning as ThermalV2Tuning | undefined;
    setTuning(seededTuning ?? DEFAULT_TUNING);
    if (!captureId) return;
    setLoading(true);
    let cancelled = false;
    void fetchThermalGrid(captureId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRawGrid(result.grid);
      setSpanState({ lo: result.grid.minC, hi: result.grid.maxC });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  // Live gray-body recompute (lib/thermal/radiometric.ts) — the same path the
  // old viewer uses, kept client-side so tuning changes never round-trip.
  const grid = useMemo<ThermalV2Grid | null>(() => {
    if (!rawGrid) return null;
    const tuned = tuneTemps(rawGrid.temps, rawGrid.minC, rawGrid.maxC, baseEmissivity, tuning.emissivity, tuning.reflected_c);
    return { ...rawGrid, temps: Array.from(tuned.temps), minC: tuned.minC, maxC: tuned.maxC };
  }, [rawGrid, baseEmissivity, tuning.emissivity, tuning.reflected_c]);

  // Auto min/max markers re-seat onto the extreme pixels of the CURRENT tuned
  // grid (S5.5) — a retune that shifts the hottest pixel moves the marker with
  // it. replaceState: automatic re-seats are not operator edits, so they don't
  // pollute the undo stack (autosave still fires off the new present state).
  useEffect(() => {
    if (!grid) return;
    const current = historyRef.current.state;
    if (!current.some((s) => s.auto)) return;
    let changed = false;
    const next = current.map((s) => {
      if (!s.auto) return s;
      const idx = extremeIndex(grid.temps, s.auto);
      // Integer pixel coords so spotStats' nearest-pixel sampling reads EXACTLY
      // the extreme pixel (center-of-pixel +0.5 rounds up into the neighbor).
      const x = idx % grid.width;
      const y = Math.floor(idx / grid.width);
      if (Math.abs(x - s.x) < 0.01 && Math.abs(y - s.y) < 0.01) return s;
      changed = true;
      return { ...s, x, y };
    });
    if (changed) historyRef.current.replaceState(next);
  }, [grid]);

  // Follow the tuned range with the display span until the operator customizes it.
  useEffect(() => {
    if (!grid || spanCustomized) return;
    setSpanState({ lo: grid.minC, hi: grid.maxC });
  }, [grid, spanCustomized]);

  function setSpan(next: { lo: number; hi: number }) {
    setSpanCustomized(true);
    setSpanState(next);
  }

  const spotSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!captureId || !grid) return;
    if (spotSaveTimer.current) clearTimeout(spotSaveTimer.current);
    spotSaveTimer.current = setTimeout(() => saveSpots(captureId, history.state), 600);
    return () => {
      if (spotSaveTimer.current) clearTimeout(spotSaveTimer.current);
    };
  }, [history.state, captureId, grid]);

  const tuningSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!captureId || !grid) return;
    if (tuningSaveTimer.current) clearTimeout(tuningSaveTimer.current);
    tuningSaveTimer.current = setTimeout(() => saveTuning(captureId, tuning), 600);
    return () => {
      if (tuningSaveTimer.current) clearTimeout(tuningSaveTimer.current);
    };
  }, [tuning, captureId, grid]);

  function createSpot(spot: ThermalV2Spot) {
    history.commitState([...history.state, spot]);
  }

  function commitSpots(next: ThermalV2Spot[]) {
    history.commitState(next);
  }

  function deleteSpot(id: string) {
    history.commitState(history.state.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (referenceId === id) setReferenceId(null);
  }

  function renameSpot(id: string, label: string) {
    history.commitState(history.state.map((s) => (s.id === id ? { ...s, label } : s)));
  }

  /** One-click "Mark hottest / Mark coldest" (S5.5) — one auto marker of each kind per image. */
  function markExtreme(kind: "max" | "min") {
    if (!grid) return;
    const idx = extremeIndex(grid.temps, kind);
    // Integer coords — see the re-seat effect note (nearest-pixel sampling).
    const x = idx % grid.width;
    const y = Math.floor(idx / grid.width);
    const label = kind === "max" ? "Hottest" : "Coldest";
    const existing = history.state.find((s) => s.auto === kind);
    if (existing) {
      history.commitState(history.state.map((s) => (s.auto === kind ? { ...s, x, y } : s)));
      setSelectedId(existing.id);
      return;
    }
    const spot: ThermalV2Spot = { id: newSpotId(), kind: "point", target: "crosshair", x, y, auto: kind, label };
    history.commitState([...history.state, spot]);
    setSelectedId(spot.id);
  }

  return {
    grid,
    loading,
    error,
    span,
    setSpan,
    isotherm,
    setIsotherm,
    tuning,
    setTuning,
    baseEmissivity,
    tool,
    setTool,
    areaShape,
    setAreaShape,
    selectedId,
    setSelectedId,
    referenceId,
    setReferenceId,
    markExtreme,
    spots: history.state,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: history.undo,
    redo: history.redo,
    createSpot,
    commitSpots,
    deleteSpot,
    renameSpot,
  };
}
