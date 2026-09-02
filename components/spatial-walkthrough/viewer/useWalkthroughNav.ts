"use client";

import { useEffect, useRef, useState } from "react";
import { isNavMode, type NavMode } from "@/lib/spatial-walkthrough/nav-mode";
import { pathHudOpacity } from "@/lib/spatial-walkthrough/path-hud";
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
  const [pathVisible, setPathVisible] = useState(true);
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
    hudOpacity: pathVisible ? pathHudOpacity(forceHud || mode === "play" || mode === "briefing" || navigating) : 0,
    pathVisible,
    togglePath: () => setPathVisible((v) => !v),
    bump,
  };
}
