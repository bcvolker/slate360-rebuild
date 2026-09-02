"use client";

import { useCallback, useEffect, useState } from "react";

import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export type AppearanceWanted = "auto" | TwinLayerRepresentation;

export function useKitchenAppearanceGate(splatReady: boolean, appearanceUrl: string | null) {
  const [layer, setLayer] = useState<TwinLayerRepresentation>("geometry");
  const [wanted, setWanted] = useState<AppearanceWanted>("auto");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!splatReady) return;
    if (wanted === "auto" || wanted === "reality") setLayer("reality");
    else if (wanted === "hybrid") setLayer("hybrid");
  }, [splatReady, wanted]);

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
    setRetryKey((n) => n + 1);
  }, []);

  const preparing = (wanted === "reality" || wanted === "hybrid" || wanted === "auto") && !splatReady;

  return { layer, wanted, requestLayer, retryKey, retryAppearance, preparing, appearanceUrl };
}
