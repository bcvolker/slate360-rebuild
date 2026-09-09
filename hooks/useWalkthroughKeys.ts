"use client";

import { useEffect } from "react";

import type { WalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";

/** Degrees turned per Left/Right press; expressed to the hook as a look-drag in pixels. */
const TURN_DEG = 20;
const LOOK_SENSITIVITY = 0.005; // must match useWalkthroughNavigation

/**
 * Keyboard walking for desktop viewers: ↑/W step to the next station ahead,
 * ↓/S step back, ←/→ (A/D) turn. Ignored while typing in a form field.
 */
export function useWalkthroughKeys(nav: WalkthroughNavigation, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const px = (TURN_DEG * Math.PI) / 180 / LOOK_SENSITIVITY;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          nav.step(1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          nav.step(-1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          nav.handleLookDrag(px, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          nav.handleLookDrag(-px, 0);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, enabled]);
}
