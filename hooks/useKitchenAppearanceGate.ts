"use client";

import { useCallback, useEffect, useState } from "react";

import { KITCHEN_APPEARANCE_TIMEOUT_MS } from "@/lib/digital-twin/kitchen-proof-world";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export type AppearanceWanted = "auto" | TwinLayerRepresentation;

export function useKitchenAppearanceGate(splatReady: boolean, appearanceUrl: string | null) {
  const [layer, setLayer] = useState<TwinLayerRepresentation>("geometry");
  const [wanted, setWanted] = useState<AppearanceWanted>("auto");
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!splatReady) return;
    if (wanted === "auto" || wanted === "reality") setLayer("reality");
    else if (wanted === "hybrid") setLayer("hybrid");
  }, [splatReady, wanted]);

  useEffect(() => {
    if (!appearanceUrl || splatReady) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), KITCHEN_APPEARANCE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [appearanceUrl, splatReady, retryKey]);

  const requestLayer = useCallback(
    (next: TwinLayerRepresentation) => {
      setWanted(next);
      if (next === "geometry") {
        setLayer("geometry");
        return;
      }
      if (splatReady) setLayer(next);
    },
    [splatReady],
  );

  const retryAppearance = useCallback(() => {
    setTimedOut(false);
    setRetryKey((n) => n + 1);
  }, []);

  const preparing = (wanted === "reality" || wanted === "hybrid") && !splatReady && !timedOut;

  return { layer, wanted, requestLayer, timedOut, retryKey, retryAppearance, preparing };
}
