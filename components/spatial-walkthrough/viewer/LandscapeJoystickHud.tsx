"use client";

import { useEffect, useRef } from "react";
import { lookFromStick, seekFromStickX, type StickVector } from "@/lib/spatial-walkthrough/joystick-map";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import { VirtualStick } from "./VirtualStick";

const ZERO: StickVector = { x: 0, y: 0 };

type Props = {
  player: WalkthroughPlayerHandle | null;
  duration: number;
  /** Live landscape detection. Tests can force the sticks on. */
  visible: boolean;
  immersive: boolean;
  offerFullscreen: boolean;
  onToggleFullscreen: () => void;
};

/**
 * Landscape-only dual sticks. The center of the sphere stays open so
 * Photo Sphere drag / mousemove look still works. The timeline range
 * scrubber stays mounted on the public toolbar.
 *
 * Manual check: open a public walk (`/w/[token]`) on a phone, rotate to
 * landscape, confirm both sticks and that dragging the middle of the panorama
 * still looks around. Tap Full screen, then rotate to portrait — the normal
 * chrome returns and no fixed overlay remains. On desktop, sticks stay hidden
 * and mouse drag still looks.
 */
export function LandscapeJoystickHud({
  player,
  duration,
  visible,
  immersive,
  offerFullscreen,
  onToggleFullscreen,
}: Props) {
  const playerRef = useRef(player);
  const durationRef = useRef(duration);
  const seekRef = useRef<StickVector>(ZERO);
  const lookRef = useRef<StickVector>(ZERO);
  const seekAt = useRef<number | null>(null);
  const engaged = useRef({ seek: false, look: false });
  const startRef = useRef<() => void>(() => undefined);
  playerRef.current = player;
  durationRef.current = duration;

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const current = playerRef.current;
      const span = durationRef.current;
      const seek = seekRef.current;
      const look = lookRef.current;
      if (current && seek.x !== 0 && span > 0) {
        if (seekAt.current == null) {
          current.pause();
          seekAt.current = current.getView().t;
        }
        seekAt.current = seekFromStickX(seekAt.current, span, seek.x, dt);
        current.seekTo(seekAt.current, undefined, undefined, { pause: false });
      } else {
        seekAt.current = null;
      }
      if (current && (look.x !== 0 || look.y !== 0)) {
        const view = current.getView();
        const next = lookFromStick(view, look, dt);
        current.animate(next.yaw, next.pitch);
      }
      if (engaged.current.seek || engaged.current.look) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    startRef.current = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    return () => {
      startRef.current = () => undefined;
      cancelAnimationFrame(raf);
    };
  }, [visible]);

  if (!visible) return null;

  const arm = (which: "seek" | "look", active: boolean) => {
    engaged.current[which] = active;
    if (!active && which === "seek") seekRef.current = ZERO;
    if (!active && which === "look") lookRef.current = ZERO;
    if (active) startRef.current();
  };

  return (
    <div className="sw-joy-hud" data-testid="sw-joy-hud">
      <button
        type="button"
        className="sw-joy-fullscreen"
        data-testid="sw-joy-fullscreen"
        data-offer={offerFullscreen ? "true" : "false"}
        aria-pressed={immersive}
        aria-label={immersive ? "Exit full screen" : "Full screen"}
        onClick={onToggleFullscreen}
      >
        {immersive ? "Exit" : "Full screen"}
      </button>
      <VirtualStick
        side="left"
        label="Scrub"
        testId="sw-joy-seek"
        onVector={(vector) => {
          seekRef.current = vector;
        }}
        onActive={(active) => arm("seek", active)}
      />
      <VirtualStick
        side="right"
        label="Look"
        testId="sw-joy-look"
        onVector={(vector) => {
          lookRef.current = vector;
        }}
        onActive={(active) => arm("look", active)}
      />
    </div>
  );
}
