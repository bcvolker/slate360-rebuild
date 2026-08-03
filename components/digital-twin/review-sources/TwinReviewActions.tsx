"use client";

import { Loader2 } from "lucide-react";

type Props = {
  disabled: boolean;
  busy: boolean;
  uploading: boolean;
  sufficient: boolean;
  onProcess: () => void;
};

export function TwinReviewActions({
  disabled,
  busy,
  uploading,
  sufficient,
  onProcess,
}: Props) {
  const label = uploading
    ? "Adding sources…"
    : busy
      ? "Starting twin…"
      : !sufficient
        ? "More credits needed"
        : "Process twin";

  return (
    <div
      className="sticky bottom-0 z-10 -mx-4 border-t border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-xl"
      data-twin-review="actions"
      data-twin-review-action="process"
    >
      <button
        type="button"
        onClick={onProcess}
        disabled={disabled}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[var(--twin360-blue)] bg-[var(--twin360-blue)] px-4 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy || uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {label}
      </button>
      <p className="mt-2 text-center text-[11px] text-[var(--graphite-muted)]">
        Nothing starts until you tap Process twin.
      </p>
    </div>
  );
}
