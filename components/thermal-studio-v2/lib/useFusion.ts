"use client";

import { useEffect, useRef, useState } from "react";
import { savePairAlign } from "@/components/thermal-studio-v2/lib/pair-align-api";
import type { ThermalV2Capture, ThermalV2PairAlign } from "@/components/thermal-studio-v2/types";

const DEFAULT_ALIGN: ThermalV2PairAlign = { dx: 0, dy: 0, scale: 1 };

/**
 * S6.5 thermal↔visual fusion blend: `blend` (0-100, session-local — resets
 * per image, same as local contrast) controls how much of the thermal
 * canvas is visible over the paired visual photo underneath; `align`
 * (dx/dy/scale) corrects the visual's registration and persists to
 * `metadata.pair_align` since misalignment is a per-image, real fact about
 * the capture, not a transient view setting.
 */
export function useFusion(activeCapture: ThermalV2Capture | null, gridReady: boolean) {
  const captureId = activeCapture?.id ?? null;
  const [blend, setBlend] = useState(100);
  const [align, setAlign] = useState<ThermalV2PairAlign>(DEFAULT_ALIGN);

  useEffect(() => {
    setBlend(100);
    const meta = (activeCapture?.metadata ?? null) as Record<string, unknown> | null;
    const seeded = meta?.pair_align as ThermalV2PairAlign | undefined;
    setAlign(seeded ?? DEFAULT_ALIGN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!captureId || !gridReady) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePairAlign(captureId, align), 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [align, captureId, gridReady]);

  function nudge(dx: number, dy: number) {
    setAlign((a) => ({ ...a, dx: a.dx + dx, dy: a.dy + dy }));
  }

  function setScale(scale: number) {
    setAlign((a) => ({ ...a, scale: Math.max(0.1, scale) }));
  }

  function resetAlign() {
    setAlign(DEFAULT_ALIGN);
  }

  return { blend, setBlend, align, nudge, setScale, resetAlign };
}
