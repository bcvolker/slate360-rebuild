"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { KITCHEN_IDLE_MS } from "@/lib/digital-twin/kitchen-proof-world";

export function useKitchenIdleChrome(holdOpen: boolean): {
  idle: boolean;
  bump: () => void;
  setIdle: (value: boolean) => void;
} {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number>(0);

  const bump = useCallback(() => {
    setIdle(false);
    window.clearTimeout(timer.current);
    if (holdOpen) return;
    timer.current = window.setTimeout(() => setIdle(true), KITCHEN_IDLE_MS);
  }, [holdOpen]);

  useEffect(() => {
    bump();
    const on = () => bump();
    window.addEventListener("pointermove", on, { passive: true });
    window.addEventListener("pointerdown", on, { passive: true });
    window.addEventListener("keydown", on);
    window.addEventListener("touchstart", on, { passive: true });
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener("pointermove", on);
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("keydown", on);
      window.removeEventListener("touchstart", on);
    };
  }, [bump]);

  useEffect(() => {
    if (holdOpen) setIdle(false);
  }, [holdOpen]);

  return { idle, bump, setIdle };
}

export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}
