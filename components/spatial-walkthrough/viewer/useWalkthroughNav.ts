"use client";

import { useEffect, useRef, useState } from "react";
import { isNavMode, type NavMode } from "@/lib/spatial-walkthrough/nav-mode";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";

const IDLE_MS = 1400;

type Args = {
  player: WalkthroughPlayerHandle | null;
  initialMode?: NavMode | string;
  forceHud?: boolean;
};

export function useWalkthroughNav({ player, initialMode = "explore", forceHud = false }: Args) {
  const start: NavMode = isNavMode(String(initialMode)) ? (initialMode as NavMode) : "explore";
  const [mode, setMode] = useState<NavMode>(start);
  const [navigating, setNavigating] = useState(forceHud || start === "play");
  const [pathVisible, setPathVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("sw-path-visible");
    if (saved === "1") return true;
    if (saved === "0") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const [pathOpacity, setPathOpacity] = useState(() => {
    if (typeof window === "undefined") return 0.28;
    const n = Number(window.localStorage.getItem("sw-path-opacity"));
    return Number.isFinite(n) && n > 0 ? Math.min(0.45, Math.max(0.15, n)) : 0.28;
  });
  const idle = useRef(0);

  const bump = () => {
    if (forceHud || mode === "play") {
      setNavigating(true);
      return;
    }
    setNavigating(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setNavigating(false), IDLE_MS);
  };

  useEffect(() => () => window.clearTimeout(idle.current), []);

  useEffect(() => {
    if (!player) return;
    if (mode === "play" || mode === "briefing") {
      player.play();
      setNavigating(true);
      return;
    }
    player.pause();
    setNavigating(Boolean(forceHud));
  }, [mode, player, forceHud]);

  return {
    mode,
    setMode,
    navigating: forceHud || mode === "play" || navigating,
    hudOpacity: pathVisible ? pathOpacity : 0,
    pathVisible,
    pathOpacity,
    togglePath: () => {
      setPathVisible((v) => {
        const next = !v;
        if (typeof window !== "undefined") window.localStorage.setItem("sw-path-visible", next ? "1" : "0");
        return next;
      });
    },
    setPathOpacity: (value: number) => {
      const next = Math.min(0.45, Math.max(0.15, value));
      setPathOpacity(next);
      if (typeof window !== "undefined") window.localStorage.setItem("sw-path-opacity", String(next));
    },
    bump,
  };
}
