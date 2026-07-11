"use client";

import { useEffect, useState } from "react";
import { tuneTemps } from "@/lib/thermal/radiometric";
import { fetchThermalGrid, type ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Capture, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

const DEFAULT_TUNING: ThermalV2Tuning = { emissivity: 0.95, reflected_c: 20 };

type SideState = { grid: ThermalV2Grid | null; loading: boolean; error: string | null };

function useCompareSide(capture: ThermalV2Capture | null): SideState {
  const [state, setState] = useState<SideState>({ grid: null, loading: false, error: null });
  const captureId = capture?.id ?? null;

  useEffect(() => {
    if (!captureId) {
      setState({ grid: null, loading: false, error: null });
      return;
    }
    setState({ grid: null, loading: true, error: null });
    let cancelled = false;
    void fetchThermalGrid(captureId).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setState({ grid: null, loading: false, error: result.error });
        return;
      }
      const meta = (capture?.metadata ?? null) as Record<string, unknown> | null;
      const tuning = (meta?.tuning as ThermalV2Tuning | undefined) ?? DEFAULT_TUNING;
      const baseEmissivity = result.grid.emissivity ?? 0.95;
      const tuned = tuneTemps(result.grid.temps, result.grid.minC, result.grid.maxC, baseEmissivity, tuning.emissivity, tuning.reflected_c);
      setState({
        grid: { ...result.grid, temps: Array.from(tuned.temps), minC: tuned.minC, maxC: tuned.maxC },
        loading: false,
        error: null,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  return state;
}

/**
 * S6.5 Compare view: fetches + tunes both sides' grids independently (each
 * uses its own saved tuning, same as the single-image path) — read-only, no
 * measurement/undo state. Extracted so AnalyzeCompareView stays presentational.
 */
export function useComparePair(captureA: ThermalV2Capture | null, captureB: ThermalV2Capture | null) {
  const a = useCompareSide(captureA);
  const b = useCompareSide(captureB);
  return { a, b };
}
