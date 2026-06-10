"use client";

import { TWIN_CAPTURE_GLASS_SQUARE, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";

type Props = {
  imageUrl: string | null;
  opacity: number;
  visible: boolean;
};

export function TwinCaptureClipGhost({ imageUrl, opacity, visible }: Props) {
  if (!visible || !imageUrl) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-end pb-[28%]"
      data-twin-chrome="clip-ghost"
      style={{ opacity, transition: "opacity 320ms ease-out" }}
    >
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        aria-hidden
      />
      <p
        data-twin-chrome="clip-ghost-caption"
        className={`relative max-w-[85%] px-3 py-2 text-center text-xs font-semibold ${TWIN_CAPTURE_HUD_TEXT} ${TWIN_CAPTURE_GLASS_SQUARE}`}
      >
        Align with your last clip, then record
      </p>
    </div>
  );
}
