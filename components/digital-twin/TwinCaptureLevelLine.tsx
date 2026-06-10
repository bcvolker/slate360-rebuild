"use client";

import {
  isTwinLevelWithinTolerance,
  TWIN_CAPTURE_POLISH,
} from "./twin-capture-polish-tokens";

type Props = {
  rollDeg: number | null;
  supported: boolean;
};

export function TwinCaptureLevelLine({ rollDeg, supported }: Props) {
  if (!supported || rollDeg === null) return null;

  const level = isTwinLevelWithinTolerance(rollDeg);
  const stroke = level ? "var(--twin360-blue)" : "var(--graphite-muted)";
  const opacity = level
    ? TWIN_CAPTURE_POLISH.levelLineLevelOpacity
    : TWIN_CAPTURE_POLISH.levelLineOpacity;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center overflow-hidden"
      data-twin-chrome="level-line"
      aria-hidden
    >
      <div
        className="relative h-full w-full"
        style={{ transform: `rotate(${rollDeg}deg)` }}
      >
        <div
          className="absolute left-[8%] right-[8%] top-1/2 h-px -translate-y-1/2"
          style={{ backgroundColor: stroke, opacity }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ borderColor: stroke, opacity }}
        />
      </div>
    </div>
  );
}
