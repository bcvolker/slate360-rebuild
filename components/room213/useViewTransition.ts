"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room213View } from "@/lib/room213/edit-state";

/**
 * View switches: cover (a short fade through the canvas colour — never a camera flight through walls), switch, and
 * lift the cover only once Spark shows the new view (onSettled from the scene), with a 6 s safety net. A cover that
 * lasts past 500 ms shows "Preparing view…". `beforeSwitch` runs synchronously on every request (clear input etc.).
 */
export function useViewTransition(reducedMotion: boolean, beforeSwitch: () => void) {
  const [view, setView] = useState<Room213View>("dollhouse");
  const [fade, setFade] = useState(false);
  const [slow, setSlow] = useState(false);
  const [settleToken, setSettleToken] = useState(0);
  const tokenRef = useRef(0);
  const pending = useRef<{ token: number; timer: number } | null>(null);
  const before = useRef(beforeSwitch);
  before.current = beforeSwitch;

  useEffect(() => {
    if (!fade) return setSlow(false);
    const t = window.setTimeout(() => setSlow(true), 500);
    return () => window.clearTimeout(t);
  }, [fade]);

  const goView = useCallback(
    (next: Room213View) => {
      before.current();
      if (next === view) return;
      setFade(true);
      window.setTimeout(() => {
        const token = ++tokenRef.current;
        if (pending.current) window.clearTimeout(pending.current.timer);
        pending.current = { token, timer: window.setTimeout(() => setFade(false), 6000) };
        setView(next);
        setSettleToken(token);
      }, reducedMotion ? 0 : 180);
    },
    [view, reducedMotion],
  );

  const onSettled = useCallback((token: number) => {
    if (pending.current?.token !== token) return;
    window.clearTimeout(pending.current.timer);
    pending.current = null;
    setFade(false);
  }, []);

  return { view, goView, fade, slow, settleToken, onSettled };
}
