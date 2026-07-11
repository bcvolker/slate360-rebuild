"use client";

import { useEffect, useRef, useState } from "react";
import { saveDisplayTransform } from "@/components/thermal-studio-v2/lib/transform-api";
import type { ThermalV2Capture, ThermalV2DisplayTransform } from "@/components/thermal-studio-v2/types";

const DEFAULT_TRANSFORM: ThermalV2DisplayTransform = { rotation: 0, flipH: false, flipV: false };

/**
 * S5.6 non-destructive rotate/flip (F1.2): seeds from and autosaves to
 * `metadata.display_transform` — a pure display transform, the grid values
 * never change. Extracted out of useAnalyzeImage to keep that hook under the
 * file-size gate.
 */
export function useDisplayTransform(activeCapture: ThermalV2Capture | null, gridReady: boolean) {
  const captureId = activeCapture?.id ?? null;
  const [transform, setTransform] = useState<ThermalV2DisplayTransform>(DEFAULT_TRANSFORM);

  useEffect(() => {
    const meta = (activeCapture?.metadata ?? null) as Record<string, unknown> | null;
    const seeded = meta?.display_transform as ThermalV2DisplayTransform | undefined;
    setTransform(seeded ?? DEFAULT_TRANSFORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!captureId || !gridReady) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDisplayTransform(captureId, transform), 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [transform, captureId, gridReady]);

  function rotate90() {
    setTransform((t) => ({ ...t, rotation: (((t.rotation + 90) % 360) as ThermalV2DisplayTransform["rotation"]) }));
  }

  function flipHorizontal() {
    setTransform((t) => ({ ...t, flipH: !t.flipH }));
  }

  function flipVertical() {
    setTransform((t) => ({ ...t, flipV: !t.flipV }));
  }

  function resetTransform() {
    setTransform(DEFAULT_TRANSFORM);
  }

  const isIdentity = transform.rotation === 0 && !transform.flipH && !transform.flipV;

  return { transform, rotate90, flipHorizontal, flipVertical, resetTransform, isIdentity };
}
