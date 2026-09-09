"use client";

import { useEffect, useState } from "react";

/**
 * R3F frameloop that stops when the tab is hidden. A splat viewer left in a background
 * tab otherwise keeps sorting and drawing at full tilt, which is what made switching
 * tabs feel like the browser had locked up.
 */
export function useVisibleFrameloop(): "always" | "never" {
  const [loop, setLoop] = useState<"always" | "never">("always");
  useEffect(() => {
    const sync = () => setLoop(document.visibilityState === "hidden" ? "never" : "always");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return loop;
}
