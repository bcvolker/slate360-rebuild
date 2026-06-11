"use client";

import { TWIN_CAPTURE_GLASS_SQUARE, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";

export type TwinGhostLevel = 0 | 1 | 2;

export const TWIN_GHOST_LEVEL_OPACITY: Record<TwinGhostLevel, number> = {
  0: 0,
  1: 0.45,
  2: 0.72,
};

const LEVEL_LABEL: Record<TwinGhostLevel, string> = {
  0: "Ghost: off",
  1: "Ghost: low",
  2: "Ghost: high",
};

type Props = {
  imageUrl: string | null;
  opacity: number;
  visible: boolean;
  level: TwinGhostLevel;
  onCycleLevel: () => void;
};

export function TwinCaptureClipGhost({ imageUrl, opacity, visible, level, onCycleLevel }: Props) {
  if (!visible || !imageUrl) return null;

  const effectiveOpacity = opacity > 0 ? TWIN_GHOST_LEVEL_OPACITY[level] : 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-start gap-2 pt-[184px]"
      data-twin-chrome="clip-ghost"
    >
      <img
        src={imageUrl}
        alt=""
        data-twin-chrome="clip-ghost-frame"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        aria-hidden
        style={{ opacity: effectiveOpacity, transition: "opacity 320ms ease-out" }}
      />
      {level > 0 ? (
        <p
          data-twin-chrome="clip-ghost-caption"
          className={`relative max-w-[85%] px-3 py-2 text-center text-xs font-semibold ${TWIN_CAPTURE_HUD_TEXT} ${TWIN_CAPTURE_GLASS_SQUARE}`}
          style={{ opacity: opacity > 0 ? 1 : 0, transition: "opacity 320ms ease-out" }}
        >
          Align with your last clip, then record
        </p>
      ) : null}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCycleLevel();
        }}
        data-twin-chrome="clip-ghost-level"
        className={`pointer-events-auto relative px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${TWIN_CAPTURE_HUD_TEXT} ${TWIN_CAPTURE_GLASS_SQUARE} transition active:scale-[0.98]`}
        style={{ opacity: opacity > 0 ? 1 : 0, transition: "opacity 320ms ease-out" }}
        aria-label="Adjust ghost overlay"
      >
        {LEVEL_LABEL[level]}
      </button>
    </div>
  );
}
