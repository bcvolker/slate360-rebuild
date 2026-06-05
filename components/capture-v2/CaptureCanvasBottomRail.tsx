"use client";

import { CAPTURE_V2_LAYERS } from "./layers";

type Props = {
  busy: boolean;
  showHint?: boolean;
  onShutterTap: () => void;
  onShutterHoldStart?: () => void;
  onShutterHoldEnd?: () => void;
};

export function CaptureCanvasBottomRail({
  busy,
  showHint = true,
  onShutterTap,
  onShutterHoldStart,
  onShutterHoldEnd,
}: Props) {
  return (
    <div
      className={`${CAPTURE_V2_LAYERS.fastTrack} relative shrink-0 px-4 pb-[max(calc(1.5rem+env(safe-area-inset-bottom)),1.75rem)] pt-2`}
    >
      <div className="flex flex-col items-center">
        {showHint ? (
          <p className="mb-4 w-full text-center text-[10px] font-semibold tracking-wide text-[var(--graphite-muted)]">
            Tap to capture · hold for sources
          </p>
        ) : null}
        <div className="flex w-full justify-center pb-6">
          <button
            type="button"
            disabled={busy}
            onClick={onShutterTap}
            onPointerDown={(event) => {
              event.preventDefault();
              onShutterHoldStart?.();
            }}
            onPointerUp={() => onShutterHoldEnd?.()}
            onPointerCancel={() => onShutterHoldEnd?.()}
            className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] border-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)] bg-[var(--graphite-primary)] shadow-[var(--mobile-app-card-glow-primary)] transition active:scale-95 disabled:opacity-50"
            aria-label="Capture photo"
          >
            <span className="h-[3.25rem] w-[3.25rem] rounded-full border-2 border-[color-mix(in_srgb,var(--graphite-canvas)_35%,transparent)] bg-[color-mix(in_srgb,white_22%,var(--graphite-primary))]" />
          </button>
        </div>
      </div>
    </div>
  );
}
