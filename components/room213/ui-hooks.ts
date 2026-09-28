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
 * The document behind the fixed viewer. Locked (default): no scroll, canvas-coloured — iOS Safari otherwise lets
 * the page slide under the viewer (a white band, a shorter viewer). Unlocked (iPhone landscape only): the page is
 * taller than the screen so one upward swipe scrolls it, which is what makes Safari collapse its bars.
 */
export function useLockedDocument(locked = true): void {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const els = [html, body];
    const keys = ["overflow", "overscrollBehavior", "background", "height", "minHeight"] as const;
    const prev = els.map((el) => keys.map((k) => el.style[k]));
    for (const el of els) {
      el.style.background = "var(--graphite-canvas)";
      el.style.overscrollBehavior = "none";
    }
    if (locked) {
      for (const el of els) {
        el.style.overflow = "hidden";
        el.style.height = "100%";
      }
      window.scrollTo(0, 0);
    } else {
      html.style.overflow = "auto";
      body.style.overflow = "visible";
      body.style.minHeight = "calc(100vh + 480px)";
    }
    return () => els.forEach((el, i) => keys.forEach((k, j) => (el.style[k] = prev[i][j])));
  }, [locked]);
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

