"use client";

import { formatTwinClipLabel, type TwinCaptureClip } from "./useTwinCaptureSession";
import { TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";

type Props = {
  clips: TwinCaptureClip[];
};

/** Horizontal clip row rendered inside the top-bar expandable panel. */
export function TwinCaptureClipChips({ clips }: Props) {
  if (clips.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto no-scrollbar rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_85%,transparent)] px-3 py-2 backdrop-blur-md"
      data-twin-chrome="clip-chips"
      aria-label="Recorded clips"
    >
      {clips.map((clip) => {
        const active = clip.recording;
        return (
          <span
            key={clip.id}
            className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${
              active
                ? "border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_18%,var(--graphite-canvas)_85%)] text-[var(--twin360-blue)]"
                : `border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] ${TWIN_CAPTURE_HUD_TEXT}`
            }`}
          >
            {active ? `● ${formatTwinClipLabel(clip)}` : formatTwinClipLabel(clip)}
          </span>
        );
      })}
    </div>
  );
}
