"use client";

import { useEffect, useState } from "react";
import type { Room213View } from "@/lib/room213/edit-state";

function seen(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSeen(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* storage blocked */
  }
}

/**
 * One-time, self-dismissing navigation hints (no modal): first Walk entry, then "rotate" once in portrait on
 * phones. A hint is marked seen only when it has actually been on screen and dismissed, so an interrupted
 * effect (StrictMode, quick view switch) never swallows it.
 */
export function NavHints({ view, coarse, landscape }: { view: Room213View; coarse: boolean; landscape: boolean }) {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (view !== "walk") return;
    let key: string | null = null;
    let text: string | null = null;
    if (!seen("room213.hint.walk")) {
      key = "room213.hint.walk";
      text = !coarse ? "Drag to look · Click the floor to move" : landscape ? "Drag to look · Joystick to move" : "Drag to look · Tap the floor to move";
    } else if (coarse && !landscape && !seen("room213.hint.rotate")) {
      key = "room213.hint.rotate";
      text = "Rotate for a movement control";
    }
    if (!key || !text) return;
    setHint(text);
    const t = window.setTimeout(() => {
      markSeen(key);
      setHint(null);
    }, 3800);
    return () => {
      window.clearTimeout(t);
      setHint(null);
    };
  }, [view, coarse, landscape]);
  if (!hint) return null;
  return (
    <p role="status" className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 mx-auto w-fit rounded-lg bg-[color-mix(in_srgb,var(--graphite-canvas)_68%,transparent)] px-3 py-1.5 text-[12px] font-medium text-[var(--mkt-surface)]">
      {hint}
    </p>
  );
}
