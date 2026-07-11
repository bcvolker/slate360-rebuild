"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUndoRedo } from "@/components/site-walk/canvas/useUndoRedo";
import { tuneTemps } from "@/lib/thermal/radiometric";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import { saveSpots } from "@/components/thermal-studio-v2/lib/spots-api";
import { saveTuning } from "@/components/thermal-studio-v2/lib/tuning-api";
import { savePalette } from "@/components/thermal-studio-v2/lib/palette-api";
import { useFlickerAB } from "@/components/thermal-studio-v2/lib/useFlickerAB";
import { useDisplayTransform } from "@/components/thermal-studio-v2/lib/useDisplayTransform";
import { useExtremeMarkers } from "@/components/thermal-studio-v2/lib/useExtremeMarkers";
import type {
  ThermalV2Alarm,
  ThermalV2Capture,
  ThermalV2SeverityBands,
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
  // S5.6 alarm suite (supersedes the old single-band isotherm) — session-local,
  // resets on image switch same as the isotherm it replaces.
  const [alarm, setAlarm] = useState<ThermalV2Alarm>({ mode: "off" });
  // S5.6 severity bands: sticky across image switches (a review criterion, not
  // a per-image display setting) — null/no preset chosen renders neutral (§1b.4).
  const [severityBands, setSeverityBands] = useState<ThermalV2SeverityBands>(null);
  // S5.6 "Local contrast (display only)" toggle — resets on image switch.
  const [localContrast, setLocalContrast] = useState(false);
  // W2 "View original" (O key, hold-to-view) — resets on image switch.
  const [viewOriginal, setViewOriginal] = useState(false);
  const [tuning, setTuning] = useState<ThermalV2Tuning>(DEFAULT_TUNING);
  // W1: palette lives in the hook (not the panel) so it seeds from and
  // autosaves to the capture's metadata like tuning/spots do.
  const [palette, setPaletteState] = useState("Iron");
  // S5.6 A/B flicker (extracted — see useFlickerAB for the swap/interval logic).
  const flicker = useFlickerAB(palette, span);
  const [tool, setTool] = useState<ThermalV2Tool>("move");
  const [areaShape, setAreaShape] = useState<"box" | "circle">("box");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  // S5.6 Δ-compare: pick two measurements, see the delta between them (not
  // just each vs the single reference). One active pair; a lighter click-
  // based flow than a right-click menu — same outcome, simpler to build/use.
  const [comparePair, setComparePair] = useState<[string, string] | null>(null);
  const [pendingCompareId, setPendingCompareId] = useState<string | null>(null);
  const history = useUndoRedo<ThermalV2Spot[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;

  const baseEmissivity = rawGrid?.emissivity ?? 0.95;

  useEffect(() => {
    setRawGrid(null);
    setSpanState(null);
    setSpanCustomized(false);
    setAlarm({ mode: "off" });
    setLocalContrast(false);
    setViewOriginal(false);
    flicker.clearFlicker();
    setError(null);
    setSelectedId(null);
    setReferenceId(null);
    const meta = (activeCapture?.metadata ?? null) as Record<string, unknown> | null;
    const seededSpots = meta?.spots;
    history.reset(Array.isArray(seededSpots) ? (seededSpots as ThermalV2Spot[]) : []);
    const seededTuning = meta?.tuning as ThermalV2Tuning | undefined;
    setTuning(seededTuning ?? DEFAULT_TUNING);
    setPaletteState(typeof meta?.palette === "string" ? meta.palette : "Iron");
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

  // S5.6 rotate/flip (F1.2, extracted — see useDisplayTransform).
  const displayTransform = useDisplayTransform(activeCapture, !!grid);

  // S5.5 "Mark hottest/coldest" + re-seat-on-retune (extracted — see useExtremeMarkers).
  const { markExtreme } = useExtremeMarkers(grid, historyRef, setSelectedId);

  // Follow the tuned range with the display span until the operator customizes it.
  useEffect(() => {
    if (!grid || spanCustomized) return;
    setSpanState({ lo: grid.minC, hi: grid.maxC });
  }, [grid, spanCustomized]);

  function setSpan(next: { lo: number; hi: number }) {
    setSpanCustomized(true);
    setSpanState(next);
  }

  function setPalette(next: string) {
    setPaletteState(next);
  }

  /** S5.6 Enhance-here (⌖ / E key): center the display span on a hovered temperature. */
  function enhanceHere(tempC: number) {
    setSpan({ lo: tempC - 2, hi: tempC + 2 });
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

  const paletteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!captureId || !grid) return;
    if (paletteSaveTimer.current) clearTimeout(paletteSaveTimer.current);
    paletteSaveTimer.current = setTimeout(() => savePalette(captureId, palette), 600);
    return () => {
      if (paletteSaveTimer.current) clearTimeout(paletteSaveTimer.current);
    };
  }, [palette, captureId, grid]);

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
    if (pendingCompareId === id) setPendingCompareId(null);
    if (comparePair && (comparePair[0] === id || comparePair[1] === id)) setComparePair(null);
  }

  /** S5.6 Δ-compare: first click arms a source, second click on another row completes the pair. */
  function toggleCompare(id: string) {
    if (comparePair) {
      setComparePair(null);
      setPendingCompareId(id);
      return;
    }
    if (!pendingCompareId) {
      setPendingCompareId(id);
      return;
    }
    if (pendingCompareId === id) {
      setPendingCompareId(null);
      return;
    }
    setComparePair([pendingCompareId, id]);
    setPendingCompareId(null);
  }

  function clearCompare() {
    setComparePair(null);
    setPendingCompareId(null);
  }

  function renameSpot(id: string, label: string) {
    history.commitState(history.state.map((s) => (s.id === id ? { ...s, label } : s)));
  }

  return {
    grid,
    /** W2 "View original": the untuned worker output (camera-true span). */
    rawGrid,
    loading,
    error,
    span,
    setSpan,
    spanCustomized,
    palette,
    setPalette,
    alarm,
    setAlarm,
    severityBands,
    setSeverityBands,
    localContrast,
    setLocalContrast,
    viewOriginal,
    setViewOriginal,
    ...flicker,
    ...displayTransform,
    enhanceHere,
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
    comparePair,
    pendingCompareId,
    toggleCompare,
    clearCompare,
  };
}
