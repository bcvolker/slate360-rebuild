"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  hidden?: boolean;
  visible: boolean;
  pointCount?: number;
};

export function TwinCaptureLidarChip({ hidden, visible, pointCount }: Props) {
  if (hidden || !visible) return null;

  const belowBarPx =
    TWIN_CAPTURE_CHROME.topBarHeightPx + TWIN_CAPTURE_CHROME.lidarChipTopGapPx;

  const label =
    typeof pointCount === "number" && pointCount > 0
      ? `LIDAR · ${pointCount >= 1000 ? `${(pointCount / 1000).toFixed(0)}K` : pointCount} pts`
      : "LIDAR";

  return (
    <div
      className="pointer-events-none absolute left-3 z-20"
      style={{
        top: `calc(max(env(safe-area-inset-top), ${TWIN_CAPTURE_CHROME.topInsetPx}px) + ${belowBarPx}px)`,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--twin360-blue)] backdrop-blur-md"
      >
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--twin360-blue)]" aria-hidden />
        {label}
      </span>
    </div>
  );
}
