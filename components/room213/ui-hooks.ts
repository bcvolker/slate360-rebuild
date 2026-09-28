"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setOn(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return on;
}

/** A boolean remembered for the page session (sessionStorage; falls back to memory when storage is blocked). */
export function useSessionBool(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(initial);
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(key);
      if (s !== null) setV(s === "1");
    } catch {
      /* storage unavailable */
    }
  }, [key]);
  const set = useCallback(
    (next: boolean) => {
      setV(next);
      try {
        sessionStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  );
  return [v, set];
}

/** Quiet controls: after `ms` without activity the strip de-emphasises (never hides); `hold` keeps it emphasised. */
export function useQuietControls(ms: number, hold: boolean) {
  const [quiet, setQuiet] = useState(false);
  const timer = useRef<number | null>(null);
  const poke = useCallback(() => {
    setQuiet(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setQuiet(true), ms);
  }, [ms]);
  useEffect(() => {
    poke();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [poke]);
  return { quiet: quiet && !hold, poke };
}

/** Backgrounding / orientation change / page hide: run `clear` (drop held movement; never reloads anything). */
export function useClearOnLifecycle(clear: () => void): void {
  const ref = useRef(clear);
  ref.current = clear;
  useEffect(() => {
    const run = () => ref.current();
    const vis = () => document.visibilityState === "hidden" && run();
    window.addEventListener("orientationchange", run);
    window.addEventListener("pagehide", run);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("orientationchange", run);
      window.removeEventListener("pagehide", run);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
}

/**
 * While the viewer is mounted the document itself must never scroll or show its own background: iOS Safari
 * otherwise lets the page slide under the fixed viewer (a white band below the toolbar, and a shorter viewer).
 * Locks html/body scrolling and paints them in the canvas colour; restored on unmount.
 */
export function useLockedDocument(): void {
  useEffect(() => {
    const els = [document.documentElement, document.body];
    const prev = els.map((el) => [el.style.overflow, el.style.overscrollBehavior, el.style.background, el.style.height] as const);
    for (const el of els) {
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "none";
      el.style.background = "var(--graphite-canvas)";
      el.style.height = "100%";
    }
    window.scrollTo(0, 0);
    return () =>
      els.forEach((el, i) => {
        [el.style.overflow, el.style.overscrollBehavior, el.style.background, el.style.height] = prev[i];
      });
  }, []);
}

/**
 * While a transient surface (content sheet, ••• menu) is open, a press anywhere outside the viewer UI
 * (`[data-r213-ui]`) closes it — and that press is consumed, so it never also steps, orbits or opens a pin.
 * Capture-phase on window: runs before the canvas's own pointer listeners.
 */
export function useOutsidePressDismiss(active: boolean, dismiss: () => void): void {
  const ref = useRef(dismiss);
  ref.current = dismiss;
  useEffect(() => {
    if (!active) return;
    let pressing = false;
    const outside = (t: EventTarget | null) => !(t instanceof Element && t.closest("[data-r213-ui]"));
    const down = (e: PointerEvent) => {
      if (!outside(e.target)) return;
      pressing = true;
      e.stopPropagation();
    };
    const move = (e: PointerEvent) => pressing && e.stopPropagation();
    const up = (e: PointerEvent) => {
      if (!pressing) return;
      pressing = false;
      e.stopPropagation();
      ref.current();
    };
    const cancel = () => (pressing = false);
    const wheel = (e: WheelEvent) => outside(e.target) && ref.current();
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    window.addEventListener("wheel", wheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("wheel", wheel, true);
    };
  }, [active]);
}

/**
 * Landscape on a touch phone → full screen, where the browser allows it (Android Chrome and most non-iOS
 * browsers). Browsers only grant full screen inside a user gesture, so it engages on the first touch after
 * rotating (that touch still does its normal job). Returning to portrait exits it again. iPhone Safari has no
 * element full screen API, so this is a no-op there.
 */
export function useLandscapeFullscreen(root: HTMLElement | null, active: boolean): void {
  useEffect(() => {
    if (!root || !document.fullscreenEnabled || typeof root.requestFullscreen !== "function") return;
    let entered = false;
    const onTouch = () => {
      if (!active || document.fullscreenElement) return;
      void root.requestFullscreen({ navigationUI: "hide" }).then(() => (entered = true)).catch(() => undefined);
    };
    root.addEventListener("pointerdown", onTouch, { capture: true });
    return () => {
      root.removeEventListener("pointerdown", onTouch, { capture: true });
      if (entered && document.fullscreenElement === root) void document.exitFullscreen().catch(() => undefined);
    };
  }, [root, active]);
}
