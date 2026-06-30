"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  /** Device reports LiDAR/depth hardware via the native plugin. */
  available?: boolean;
  /** A depth session is running and producing points. */
  active: boolean;
  pointCount?: number;
  /** Temporary diagnostic line (raw plugin probe result) shown only in debug. */
  note?: string | null;
  /** Dev diagnostics — surfaces the inactive/no-hardware states. Off in production. */
  debug?: boolean;
};

/**
 * Depth-capture status — POSITIVE-ONLY in production. The chip appears ONLY when a depth
 * session is actually running ("LIDAR · 42K pts"). On every other path — non-LiDAR iPhone,
 * Android, web — it renders NOTHING, so a device without depth hardware shows a clean,
 * complete capture screen with no "VIDEO ONLY" / "missing feature" signal. The diagnostic
 * inactive states are kept behind `debug` for routing checks only. Tokens only (no amber,
 * no rounded-full). See docs/CAPTURE_AND_SHELL_BLOCKERS_LOG.md (LiDAR-optional).
 */
export function TwinCaptureLidarChip({ available, active, pointCount, note, debug }: Props) {
  const belowBarPx =
    TWIN_CAPTURE_CHROME.topBarHeightPx + TWIN_CAPTURE_CHROME.lidarChipTopGapPx;

  // Production: only the active depth indicator ever shows. No negative states.
  if (!active && !debug) return null;

  const activeLabel =
    typeof pointCount === "number" && pointCount > 0
      ? `LIDAR · ${pointCount >= 1000 ? `${(pointCount / 1000).toFixed(0)}K` : pointCount} pts`
      : "LIDAR";
  const label = active ? activeLabel : available ? "DEPTH IDLE" : "VIDEO";
  const toneClass = active
    ? "border-[var(--accent-border-blue)] text-[var(--twin360-blue)]"
    : "border-white/15 text-zinc-300";
  const dotClass = active ? "animate-pulse bg-[var(--twin360-blue)]" : "bg-zinc-400";

  return (
    <div
      className="pointer-events-none absolute left-3 z-20"
      style={{
        top: `calc(max(env(safe-area-inset-top), ${TWIN_CAPTURE_CHROME.topInsetPx}px) + ${belowBarPx}px)`,
      }}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${toneClass}`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-sm ${dotClass}`} aria-hidden />
        {label}
      </span>
      {debug && note ? (
        <span className="mt-1 block max-w-[64vw] rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] leading-tight text-zinc-300">
          {note}
        </span>
      ) : null}
    </div>
  );
}
