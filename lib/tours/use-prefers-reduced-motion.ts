"use client";

import { useEffect, useState } from "react";

/**
 * Every animated interaction in the plan-sheet tour (§8.3 of TOUR_BUILDER_PLAN.md)
 * has an explicit reduced-motion fallback — this is the single source of truth
 * for whether to use it. Reads the live media query so it responds if the OS
 * setting changes while the tab is open, not just at mount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
