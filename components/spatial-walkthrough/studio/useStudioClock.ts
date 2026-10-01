"use client";

import { useEffect, useState } from "react";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";

export type StudioClock = {
  t: number;
  yaw: number;
  pitch: number;
  playing: boolean;
};

export function useStudioClock(player: WalkthroughPlayerHandle | null): StudioClock {
  const [clock, setClock] = useState<StudioClock>({ t: 0, yaw: 0, pitch: 0, playing: false });
  useEffect(() => {
    if (!player) return;
    const tick = window.setInterval(() => {
      const view = player.getView();
      setClock({ t: view.t, yaw: view.yaw, pitch: view.pitch, playing: !player.isPaused() });
    }, 200);
    return () => window.clearInterval(tick);
  }, [player]);
  return clock;
}

export function useStudioHotkeys(
  player: WalkthroughPlayerHandle | null,
  onPin: () => void,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!player) return;
        if (player.isPaused()) player.play();
        else player.pause();
      }
      if (e.key === "m" || e.key === "M") onPin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player, onPin]);
}
