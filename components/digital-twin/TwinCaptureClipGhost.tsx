"use client";

import { TWIN_CAPTURE_GLASS_SQUARE, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";

export type TwinGhostLevel = 0 | 1 | 2;

export const TWIN_GHOST_LEVEL_OPACITY: Record<TwinGhostLevel, number> = {
  0: 0,
  1: 0.45,
  2: 0.72,
};

type Props = {
  imageUrl: string | null;
  opacity: number;
  visible: boolean;
  level: TwinGhostLevel;
  onSetLevel: (level: TwinGhostLevel) => void;
};

export function TwinCaptureClipGhost({ imageUrl, opacity, visible, level, onSetLevel }: Props) {
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
      <div
        className={`pointer-events-auto relative flex items-center gap-1 p-1 ${TWIN_CAPTURE_GLASS_SQUARE}`}
        style={{ opacity: opacity > 0 ? 1 : 0, transition: "opacity 320ms ease-out" }}
        data-twin-chrome="clip-ghost-level"
        role="radiogroup"
        aria-label="Overlay strength"
      >
        <span className={`px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${TWIN_CAPTURE_HUD_TEXT}`}>
          Overlay
        </span>
        {([0, 1, 2] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={level === value}
            onClick={(event) => {
              event.stopPropagation();
              onSetLevel(value);
            }}
            className={`rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition ${
              level === value
                ? "bg-[color-mix(in_srgb,var(--twin360-blue)_22%,transparent)] text-[var(--twin360-blue)]"
                : TWIN_CAPTURE_HUD_TEXT
            }`}
          >
            {value === 0 ? "Off" : value === 1 ? "Low" : "High"}
          </button>
        ))}
      </div>
    </div>
  );
}
