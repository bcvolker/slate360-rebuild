"use client";

import { useEffect, type RefObject } from "react";
import { newSpotId } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Grid } from "@/components/thermal-studio-v2/lib/grid-api";
import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";

type History = {
  state: ThermalV2Spot[];
  commitState: (next: ThermalV2Spot[]) => void;
  replaceState: (next: ThermalV2Spot[]) => void;
};

function extremeIndex(temps: number[], kind: "max" | "min"): number {
  let best = 0;
  for (let i = 1; i < temps.length; i++) {
    if (kind === "max" ? temps[i] > temps[best] : temps[i] < temps[best]) best = i;
  }
  return best;
}

/**
 * S5.5 "Mark hottest / Mark coldest" one-click auto markers, plus the effect
 * that re-seats them onto the current tuned grid's extreme pixel whenever
 * tuning shifts it. Extracted out of useAnalyzeImage for the file-size gate.
 */
export function useExtremeMarkers(grid: ThermalV2Grid | null, historyRef: RefObject<History>, setSelectedId: (id: string | null) => void) {
  // A retune that shifts the hottest pixel moves the marker with it.
  // replaceState: automatic re-seats are not operator edits, so they don't
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  function markExtreme(kind: "max" | "min") {
    if (!grid) return;
    const idx = extremeIndex(grid.temps, kind);
    const x = idx % grid.width;
    const y = Math.floor(idx / grid.width);
    const label = kind === "max" ? "Hottest" : "Coldest";
    const history = historyRef.current;
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

  return { markExtreme };
}
