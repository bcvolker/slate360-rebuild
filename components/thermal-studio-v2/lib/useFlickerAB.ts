"use client";

import { useEffect, useState } from "react";

type FlickerSnapshot = { palette: string; span: { lo: number; hi: number } };

/**
 * S5.6 A/B flicker: two named snapshots of {palette, span}; once both exist
 * the canvas paints whichever is "showing", swappable manually (button / `\`)
 * or via an optional 2Hz auto-interval (skipped under prefers-reduced-motion).
 * Extracted out of useAnalyzeImage to keep that hook under the 300-line gate.
 */
export function useFlickerAB(livePalette: string, liveSpan: { lo: number; hi: number } | null) {
  const [flickerA, setFlickerA] = useState<FlickerSnapshot | null>(null);
  const [flickerB, setFlickerB] = useState<FlickerSnapshot | null>(null);
  const [flickerShowing, setFlickerShowing] = useState<"A" | "B">("A");
  const [autoFlicker, setAutoFlicker] = useState(false);

  useEffect(() => {
    if (!autoFlicker || !flickerA || !flickerB) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFlickerShowing((s) => (s === "A" ? "B" : "A")), 500);
    return () => clearInterval(id);
  }, [autoFlicker, flickerA, flickerB]);

  function snapshotFlickerA() {
    if (!liveSpan) return;
    setFlickerA({ palette: livePalette, span: liveSpan });
  }

  function snapshotFlickerB() {
    if (!liveSpan) return;
    setFlickerB({ palette: livePalette, span: liveSpan });
  }

  function toggleFlickerView() {
    setFlickerShowing((s) => (s === "A" ? "B" : "A"));
  }

  function clearFlicker() {
    setFlickerA(null);
    setFlickerB(null);
    setAutoFlicker(false);
  }

  const flickerActive = !!(flickerA && flickerB);
  const displayPalette = flickerActive ? (flickerShowing === "A" ? flickerA!.palette : flickerB!.palette) : livePalette;
  const displaySpan = flickerActive ? (flickerShowing === "A" ? flickerA!.span : flickerB!.span) : liveSpan;

  return {
    flickerA,
    flickerB,
    flickerShowing,
    flickerActive,
    autoFlicker,
    setAutoFlicker,
    snapshotFlickerA,
    snapshotFlickerB,
    toggleFlickerView,
    clearFlicker,
    displayPalette,
    displaySpan,
  };
}
