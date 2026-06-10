"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS } from "./twin-capture-glass";

type Props = {
  hidden?: boolean;
  frameCount: number;
  frameCap: number;
  atCap: boolean;
};

export function TwinCaptureFrameCapChip({ hidden, frameCount, frameCap, atCap }: Props) {
  if (hidden || frameCount === 0) return null;

  const topOffset =
    TWIN_CAPTURE_CHROME.topInsetPx +
    TWIN_CAPTURE_CHROME.topBarHeightPx +
    52;

  return (
    <div
      className="pointer-events-none absolute left-3 z-20"
      style={{ top: `calc(max(env(safe-area-inset-top), 0px) + ${topOffset}px)` }}
      data-twin-chrome="frame-cap-chip"
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${TWIN_CAPTURE_GLASS}`}
        style={{ opacity: atCap ? 1 : 0.85 }}
      >
        <span className={atCap ? "text-[var(--destructive)]" : "text-[var(--graphite-text-header)]"}>
          {frameCount}/{frameCap} FRAMES
        </span>
        {atCap ? (
          <span className="font-semibold text-[var(--destructive)]">CAP REACHED</span>
        ) : null}
      </span>
    </div>
  );
}
