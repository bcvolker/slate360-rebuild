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
  if (!supported) return null;

  const roll = rollDeg ?? 0;
  const level = isTwinLevelWithinTolerance(roll);
  const stroke = level ? "var(--twin360-blue)" : "#E8EDF3";
  const opacity = level
    ? TWIN_CAPTURE_POLISH.levelLineLevelOpacity
    : TWIN_CAPTURE_POLISH.levelLineOpacity;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center overflow-hidden"
      data-twin-chrome="level-line"
      aria-hidden
    >
      <div
        className="relative h-full w-full"
        style={{ transform: `rotate(${roll}deg)` }}
      >
        <div
          className="absolute left-[8%] right-[8%] top-1/2 h-[2px] -translate-y-1/2 shadow-[0_0_6px_rgba(0,0,0,0.45)]"
          style={{ backgroundColor: stroke, opacity }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_6px_rgba(0,0,0,0.45)]"
          style={{ borderColor: stroke, opacity }}
        />
      </div>
    </div>
  );
}
