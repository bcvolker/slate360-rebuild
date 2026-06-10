"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  hidden?: boolean;
  visible: boolean;
};

export function TwinCaptureLidarChip({ hidden, visible }: Props) {
  if (hidden || !visible) return null;

  const belowBarPx =
    TWIN_CAPTURE_CHROME.topBarHeightPx + TWIN_CAPTURE_CHROME.lidarChipTopGapPx;

  return (
    <div
      className="pointer-events-none absolute left-3 z-20"
      style={{
        top: `calc(max(env(safe-area-inset-top), ${TWIN_CAPTURE_CHROME.topInsetPx}px) + ${belowBarPx}px)`,
      }}
    >
      <span
        className="inline-flex items-center rounded-full border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--twin360-blue)] backdrop-blur-md"
      >
        LIDAR
      </span>
    </div>
  );
}
