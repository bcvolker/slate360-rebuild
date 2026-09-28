"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room213View } from "@/lib/room213/edit-state";

/** Why the cover lifted: SETTLED = the renderer reported the finished frame; FAILSAFE = the hang guard fired. */
export type TransitionOutcome = { token: number; to: Room213View; outcome: "SETTLED" | "FAILSAFE"; ms: number };

/** Hang guard only: a sort that never completes must not trap the viewer behind the cover. Not a readiness signal. */
const FAILSAFE_MS = 8000;

/**
 * View switches and camera jumps: cover (a short fade through the canvas colour — never a camera flight through
 * walls), switch/jump underneath, and lift the cover when the scene reports the new viewpoint fully rendered
 * (sorted from where the camera now is — see Room213Scene). A cover that lasts past 500 ms shows "Preparing view…".
 * `beforeSwitch` runs synchronously on every request (clear input etc.).
 */
export function useViewTransition(reducedMotion: boolean, beforeSwitch: () => void) {
  const [view, setView] = useState<Room213View>("dollhouse");
  const [fade, setFade] = useState(false);
  const [slow, setSlow] = useState(false);
  const [settleToken, setSettleToken] = useState(0);
  const tokenRef = useRef(0);
  const pending = useRef<{ token: number; to: Room213View; at: number; timer: number } | null>(null);
  const log = useRef<TransitionOutcome[]>([]);
  const before = useRef(beforeSwitch);
  before.current = beforeSwitch;

  useEffect(() => {
    if (!fade) return setSlow(false);
    const t = window.setTimeout(() => setSlow(true), 500);
    return () => window.clearTimeout(t);
  }, [fade]);

  const finish = useCallback((token: number, outcome: TransitionOutcome["outcome"]) => {
    const p = pending.current;
    if (p?.token !== token) return;
    window.clearTimeout(p.timer);
    pending.current = null;
    log.current = [...log.current.slice(-19), { token, to: p.to, outcome, ms: Math.round(performance.now() - p.at) }];
    if (outcome === "FAILSAFE") console.warn("[room213] view transition hit the failsafe", log.current.at(-1));
    setFade(false);
  }, []);

  /** Switch view; `apply` (a camera jump) runs under the cover and forces a covered transition even when the view
   *  itself doesn't change (Reset, View in room). */
  const goView = useCallback(
    (next: Room213View, apply?: () => void) => {
      before.current();
      if (next === view && !apply) return;
      setFade(true);
      window.setTimeout(() => {
        const token = ++tokenRef.current;
        if (pending.current) window.clearTimeout(pending.current.timer);
        pending.current = { token, to: next, at: performance.now(), timer: window.setTimeout(() => finish(token, "FAILSAFE"), FAILSAFE_MS) };
        apply?.();
        setView(next);
        setSettleToken(token);
      }, reducedMotion ? 0 : 180);
    },
    [view, reducedMotion, finish],
  );

  const onSettled = useCallback((token: number) => finish(token, "SETTLED"), [finish]);
  const transitions = useCallback(() => [...log.current], []);

  return { view, goView, fade, slow, settleToken, onSettled, transitions };
}
