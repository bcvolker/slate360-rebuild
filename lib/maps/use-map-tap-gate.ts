"use client";

import { useEffect, useRef } from "react";
import { bindMapTapGate, createMapTapGate, type MapTapGate } from "./pin-placement";

type MapWithDiv = { getDiv: () => HTMLElement };

/** Tracks pan/pinch on a Google map so a click can be rejected unless it was a tap. */
export function useMapTapGate(map: MapWithDiv | null | undefined) {
  const gateRef = useRef<MapTapGate | null>(null);
  if (!gateRef.current) gateRef.current = createMapTapGate();

  useEffect(() => {
    const div = map?.getDiv?.();
    const gate = gateRef.current;
    if (!div || !gate) return;
    return bindMapTapGate(div, gate);
  }, [map]);

  return gateRef;
}
