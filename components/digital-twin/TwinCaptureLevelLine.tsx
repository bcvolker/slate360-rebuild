"use client";

import {
  isTwinLevelWithinTolerance,
  TWIN_CAPTURE_GUIDE,
} from "./twin-capture-polish-tokens";
import { TWIN_CAPTURE_GLASS } from "./twin-capture-glass";

type Props = {
  rollDeg: number | null;
  supported: boolean;
};

/**
 * Spirit-level bubble: a fixed glass track with a sliding dot. The dot drifts
 * toward the tilt direction and snaps green when the phone is level — far
 * calmer than rotating a full-screen horizon line with raw sensor data.
 */
export function TwinCaptureLevelLine({ rollDeg, supported }: Props) {
  if (!supported) return null;

  const rawRoll = rollDeg ?? 0;
  const deadbanded =
    Math.abs(rawRoll) <= TWIN_CAPTURE_GUIDE.rollDeadbandDeg ? 0 : rawRoll;
  const clamped = Math.max(
    -TWIN_CAPTURE_GUIDE.rollMaxDeg,
    Math.min(TWIN_CAPTURE_GUIDE.rollMaxDeg, deadbanded),
  );
  const offsetPx = clamped * TWIN_CAPTURE_GUIDE.bubblePxPerDeg;
  const level = isTwinLevelWithinTolerance(rawRoll);
  const levelGreen = "#22C55E";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/2 z-[4] flex -translate-y-1/2 justify-center"
      data-twin-chrome="level-line"
      data-twin-level={level ? "level" : "tilted"}
      aria-hidden
    >
      <div
        className={`relative flex items-center justify-center ${TWIN_CAPTURE_GLASS}`}
        style={{
          width: TWIN_CAPTURE_GUIDE.bubbleTrackWidthPx,
          height: TWIN_CAPTURE_GUIDE.bubbleTrackHeightPx,
          borderColor: level ? `color-mix(in srgb, ${levelGreen} 55%, transparent)` : undefined,
        }}
      >
        {/* center target ticks */}
        <span
          className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-[11px] -translate-y-1/2"
          style={{ backgroundColor: level ? levelGreen : "var(--graphite-muted)" }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-3 w-px translate-x-[10px] -translate-y-1/2"
          style={{ backgroundColor: level ? levelGreen : "var(--graphite-muted)" }}
        />
        {/* bubble */}
        <span
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: TWIN_CAPTURE_GUIDE.bubbleSizePx,
            height: TWIN_CAPTURE_GUIDE.bubbleSizePx,
            transform: `translate(calc(-50% + ${offsetPx}px), -50%)`,
            backgroundColor: level ? levelGreen : "#E8EDF3",
            transition: "transform 180ms ease-out, background-color 200ms ease",
          }}
        />
      </div>
    </div>
  );
}
