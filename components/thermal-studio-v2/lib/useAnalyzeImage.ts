"use client";

import { useEffect, useRef, useState } from "react";
import { useUndoRedo } from "@/components/site-walk/canvas/useUndoRedo";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { saveSpots } from "@/components/thermal-studio-v2/lib/spots-api";
import type { ThermalV2Capture, ThermalV2Spot, ThermalV2Tool } from "@/components/thermal-studio-v2/types";

/**
 * Owns everything the Analyze tab needs for the ACTIVE image: grid fetch,
 * display span, and the measurement history (undo/redo + autosave). Lifted
 * out of the viewer so the Measurements right rail can share the same state.
 */
export function useAnalyzeImage(activeCapture: ThermalV2Capture | null) {
  const captureId = activeCapture?.id ?? null;
  const [grid, setGrid] = useState<ThermalV2Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [span, setSpan] = useState<{ lo: number; hi: number } | null>(null);
  const [tool, setTool] = useState<ThermalV2Tool>("move");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const history = useUndoRedo<ThermalV2Spot[]>([]);

  useEffect(() => {
    setGrid(null);
    setSpan(null);
    setError(null);
    setSelectedId(null);
    setReferenceId(null);
    const seeded = activeCapture?.metadata?.spots;
    history.reset(Array.isArray(seeded) ? (seeded as ThermalV2Spot[]) : []);
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
      setGrid(result.grid);
      setSpan({ lo: result.grid.minC, hi: result.grid.maxC });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!captureId || !grid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSpots(captureId, history.state), 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [history.state, captureId, grid]);

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
