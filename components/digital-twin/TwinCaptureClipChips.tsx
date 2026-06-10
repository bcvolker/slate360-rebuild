"use client";

import { formatTwinClipLabel, type TwinCaptureClip } from "./useTwinCaptureSession";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";

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
            className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${
              active
                ? "border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_18%,var(--graphite-canvas)_85%)] text-[var(--twin360-blue)]"
                : `border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_85%,transparent)] ${TWIN_CAPTURE_HUD_TEXT}`
            }`}
          >
            {active ? `● ${formatTwinClipLabel(clip)}` : formatTwinClipLabel(clip)}
          </span>
        );
      })}
    </div>
  );
}
