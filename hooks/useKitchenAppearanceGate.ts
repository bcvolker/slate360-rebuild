"use client";

import { useCallback, useEffect, useState } from "react";

import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export type AppearanceWanted = "auto" | TwinLayerRepresentation;

export function useKitchenAppearanceGate(realityPainted: boolean, appearanceUrl: string | null) {
  const [layer, setLayer] = useState<TwinLayerRepresentation>("geometry");
  const [wanted, setWanted] = useState<AppearanceWanted>("auto");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!realityPainted) return;
    if (wanted === "auto" || wanted === "reality") setLayer("reality");
    else if (wanted === "hybrid") setLayer("hybrid");
  }, [realityPainted, wanted]);

  const requestLayer = useCallback(
    (next: TwinLayerRepresentation) => {
      setWanted(next);
      if (next === "geometry") {
        setLayer("geometry");
        return;
      }
      if (realityPainted) setLayer(next);
    },
    [realityPainted],
  );

  const retryAppearance = useCallback(() => {
    setRetryKey((n) => n + 1);
  }, []);

  const preparing = (wanted === "reality" || wanted === "hybrid" || wanted === "auto") && !realityPainted;

  return { layer, wanted, requestLayer, retryKey, retryAppearance, preparing, appearanceUrl };
}
