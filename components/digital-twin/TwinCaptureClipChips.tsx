"use client";

import { formatTwinClipLabel, type TwinCaptureClip } from "./useTwinCaptureSession";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  hidden?: boolean;
  clips: TwinCaptureClip[];
  activeClipId: string | null;
};

export function TwinCaptureClipChips({ hidden, clips }: Props) {
  if (hidden || clips.length === 0) return null;

  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-start gap-2 overflow-x-auto no-scrollbar px-3"
      style={{
        bottom: `calc(${TWIN_CAPTURE_CHROME.clipChipsBottomPx}px + ${safeBottom})`,
      }}
      data-twin-chrome="clip-chips"
      aria-label="Recorded clips"
    >
      {clips.map((clip) => {
        const active = clip.recording;
        return (
          <span
            key={clip.id}
            className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${
              active
                ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]"
                : "border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] text-[var(--graphite-muted)]"
            }`}
          >
            {active ? `● ${formatTwinClipLabel(clip)}` : formatTwinClipLabel(clip)}
          </span>
        );
      })}
    </div>
  );
}
