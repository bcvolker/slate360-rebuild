"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  /** Device reports LiDAR/depth hardware via the native plugin. */
  available?: boolean;
  /** A depth session is running and producing points. */
  active: boolean;
  pointCount?: number;
};

/**
 * Honest depth-capture status — never silent. On the web getUserMedia path a
 * depth session can't run (iOS won't let ARKit and the WebView camera co-own the
 * sensor), so instead of hiding the chip we say so plainly. The three states
 * also diagnose routing problems:
 *   active            → blue  "LIDAR · 42K pts"     depth is recording
 *   available, !active→ amber "DEPTH NOT ACTIVE"    capable device on the wrong (web) path
 *   !available        → zinc  "VIDEO ONLY"          no depth hardware / plugin
 */
export function TwinCaptureLidarChip({ available, active, pointCount }: Props) {
  const belowBarPx =
    TWIN_CAPTURE_CHROME.topBarHeightPx + TWIN_CAPTURE_CHROME.lidarChipTopGapPx;

  let label: string;
  let tone: "active" | "warn" | "muted";
  if (active) {
    label =
      typeof pointCount === "number" && pointCount > 0
        ? `LIDAR · ${pointCount >= 1000 ? `${(pointCount / 1000).toFixed(0)}K` : pointCount} pts`
        : "LIDAR";
    tone = "active";
  } else if (available) {
    label = "DEPTH NOT ACTIVE";
    tone = "warn";
  } else {
    label = "VIDEO ONLY";
    tone = "muted";
  }

  const toneClass =
    tone === "active"
      ? "border-[var(--accent-border-blue)] text-[var(--twin360-blue)]"
      : tone === "warn"
        ? "border-amber-400/40 text-amber-300"
        : "border-white/15 text-zinc-300";
  const dotClass =
    tone === "active"
      ? "animate-pulse bg-[var(--twin360-blue)]"
      : tone === "warn"
        ? "bg-amber-300"
        : "bg-zinc-400";

  return (
    <div
      className="pointer-events-none absolute left-3 z-20"
      style={{
        top: `calc(max(env(safe-area-inset-top), ${TWIN_CAPTURE_CHROME.topInsetPx}px) + ${belowBarPx}px)`,
      }}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${toneClass}`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
        {label}
      </span>
    </div>
  );
}
