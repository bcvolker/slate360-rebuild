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
