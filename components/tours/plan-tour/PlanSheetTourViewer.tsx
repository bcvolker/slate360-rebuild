"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicPlanTour, SceneRuntime } from "@/lib/types/tours";
import { usePrefersReducedMotion } from "@/lib/tours/use-prefers-reduced-motion";
import { PlanPinMarker } from "./PlanPinMarker";
import { PlanSheetStrip } from "./PlanSheetStrip";
import { PublicTourPanoViewer } from "@/components/tours/PublicTourPanoViewer";

type Phase = "sheet" | "diving-in" | "pano" | "diving-out";

const DIVE_IN_MS = 420;
const DIVE_OUT_MS = 320;
const PANO_SWITCH_MS = 380;
const SHEET_SWITCH_MS = 280;

/**
 * Plan-sheet tour recipient viewer — full-bleed plan sheet with numbered pins,
 * bottom sheet-strip, pin-tap "dive" into the linked panorama, breadcrumb back,
 * and next/prev pin-to-pin navigation. Timings match TOUR_BUILDER_PLAN.md §8.3
 * exactly; every animated interaction has a reduced-motion (instant/hard-cut)
 * fallback. "Overshoot, settle" on pano entry is read as start-slightly-larger-
 * then-decelerate-to-rest (ease-out), not a literal bounce — the spec's own
 * tone guidance is explicit: "calm, premium — never bouncy".
 *
 * Pano entry/exit never runs two PSV/WebGL Viewer instances at once (mobile
 * GPU memory safety) — the sheet and pano cross-FADE visually, but the pano
 * only mounts once the dive-in animation completes, and unmounts before the
 * dive-out animation's sheet reveal.
 */
export function PlanSheetTourViewer({
  planTour,
  slug,
  tourTitle,
}: {
  planTour: PublicPlanTour;
  slug: string;
  tourTitle: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [activeSheetId, setActiveSheetId] = useState(planTour.sheets[0]?.id ?? "");
  const [phase, setPhase] = useState<Phase>("sheet");
  const [activePinIndex, setActivePinIndex] = useState<number | null>(null);
  const [sceneRuntime, setSceneRuntime] = useState<SceneRuntime | null>(null);
  const [sheetSwitching, setSheetSwitching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSheet = planTour.sheets.find((s) => s.id === activeSheetId) ?? planTour.sheets[0];
  const sheetPins = planTour.pins.filter((p) => p.sheetId === activeSheet?.id);
  const activePin = activePinIndex !== null ? planTour.pins[activePinIndex] : null;

  const clearPendingTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  useEffect(() => clearPendingTimeout, []);

  const loadScene = useCallback(async (sceneId: string) => {
    setSceneRuntime(null);
    const res = await fetch(`/api/tours/public/${slug}/scenes/${sceneId}`);
    if (res.ok) {
      const json = await res.json();
      setSceneRuntime((json?.data ?? json) as SceneRuntime);
    }
  }, [slug]);

  function divePin(pinIndexInAll: number) {
    const pin = planTour.pins[pinIndexInAll];
    if (!pin) return;
    setActivePinIndex(pinIndexInAll);
    void loadScene(pin.sceneId);

    if (reducedMotion) {
      setPhase("pano");
      return;
    }
    setPhase("diving-in");
    clearPendingTimeout();
    timeoutRef.current = setTimeout(() => setPhase("pano"), DIVE_IN_MS);
  }

  function handlePinClick(pin: (typeof planTour.pins)[number]) {
    const index = planTour.pins.findIndex((p) => p.id === pin.id);
    divePin(index);
  }

  function handleBack() {
    if (reducedMotion) {
      setPhase("sheet");
      setActivePinIndex(null);
      setSceneRuntime(null);
      return;
    }
    setPhase("diving-out");
    clearPendingTimeout();
    timeoutRef.current = setTimeout(() => {
      setPhase("sheet");
      setActivePinIndex(null);
      setSceneRuntime(null);
    }, DIVE_OUT_MS);
  }

  function handleAdjacentPin(direction: 1 | -1) {
    if (activePinIndex === null) return;
    const next = (activePinIndex + direction + planTour.pins.length) % planTour.pins.length;
    if (reducedMotion) {
      setActivePinIndex(next);
      void loadScene(planTour.pins[next].sceneId);
      return;
    }
    // Fade-through rather than a true crossfade — swapping scenes means a new
    // PSV Viewer, and running two WebGL contexts at once risks mobile GPU
    // memory exhaustion. Fading to a brief dip and back reads as "subtle
    // crossfade" without that risk.
    setSceneRuntime(null);
    clearPendingTimeout();
    timeoutRef.current = setTimeout(() => {
      setActivePinIndex(next);
      void loadScene(planTour.pins[next].sceneId);
    }, PANO_SWITCH_MS / 2);
  }

  function handleSelectSheet(sheetId: string) {
    if (sheetId === activeSheetId) return;
    if (reducedMotion) {
      setActiveSheetId(sheetId);
      return;
    }
    setSheetSwitching(true);
    clearPendingTimeout();
    timeoutRef.current = setTimeout(() => {
      setActiveSheetId(sheetId);
      setSheetSwitching(false);
    }, SHEET_SWITCH_MS);
  }

  const isPanoVisible = phase === "pano" || phase === "diving-out";
  const isSheetVisible = phase === "sheet" || phase === "diving-in";

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* ── Plan sheet layer ─────────────────────────────────────── */}
      {isSheetVisible && activeSheet && (
        <div
          className="absolute inset-0"
          style={{
            transitionProperty: "transform, opacity",
            transitionDuration: reducedMotion ? "0ms" : `${phase === "diving-in" ? DIVE_IN_MS : SHEET_SWITCH_MS}ms`,
            transitionTimingFunction: "ease-in-out",
            transform: phase === "diving-in" && activePin
              ? `scale(2.4)`
              : "scale(1)",
            transformOrigin: phase === "diving-in" && activePin ? `${activePin.xPct}% ${activePin.yPct}%` : "center",
            opacity: phase === "diving-in" || sheetSwitching ? 0 : 1,
          }}
        >
          {activeSheet.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeSheet.imageUrl} alt={activeSheet.sheetName ?? "Plan sheet"} className="h-full w-full object-contain" />
          )}
          {sheetPins.map((pin) => (
            <PlanPinMarker
              key={pin.id}
              pinNumber={pin.pinNumber}
              xPct={pin.xPct}
              yPct={pin.yPct}
              isActive={false}
              reducedMotion={reducedMotion}
              onClick={() => handlePinClick(pin)}
            />
          ))}

          <div className="pointer-events-none absolute left-4 top-4 z-10">
            <h1 className="text-lg font-bold text-white drop-shadow-lg">{tourTitle}</h1>
          </div>

          <PlanSheetStrip sheets={planTour.sheets} activeSheetId={activeSheetId} onSelectSheet={handleSelectSheet} />
        </div>
      )}

      {/* ── Pano layer ───────────────────────────────────────────── */}
      {isPanoVisible && (
        <div
          className="absolute inset-0"
          style={{
            transitionProperty: "transform, opacity",
            transitionDuration: reducedMotion ? "0ms" : `${phase === "diving-out" ? DIVE_OUT_MS : DIVE_IN_MS}ms`,
            transitionTimingFunction: phase === "diving-out" ? "ease-in" : "ease-out",
            transform: phase === "pano" ? "scale(1)" : phase === "diving-out" ? "scale(1.06)" : "scale(1.06)",
            opacity: sceneRuntime ? 1 : 0,
          }}
        >
          {sceneRuntime ? (
            <PublicTourPanoViewer scene={sceneRuntime} />
          ) : (
            <div className="flex h-full items-center justify-center text-white/60">Loading…</div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
            <button
              type="button"
              onClick={handleBack}
              className="pointer-events-auto flex items-center gap-1 text-sm text-white/80 drop-shadow hover:text-white"
            >
              <ChevronLeft className="size-4" /> {activeSheet?.sheetName ?? "Plan sheet"}
            </button>
            {activePin?.title && <p className="text-sm text-white/80 drop-shadow">{activePin.title}</p>}
          </div>

          {planTour.pins.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleAdjacentPin(-1)}
                className="pointer-events-auto flex size-9 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                aria-label="Previous pin"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjacentPin(1)}
                className="pointer-events-auto flex size-9 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                aria-label="Next pin"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
