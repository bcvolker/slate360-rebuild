"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUndoRedo } from "@/components/site-walk/canvas/useUndoRedo";
import { tuneTemps } from "@/lib/thermal/radiometric";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const history = useUndoRedo<ThermalV2Spot[]>([]);

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
    selectedId,
    setSelectedId,
    referenceId,
    setReferenceId,
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
