"use client";

import { Loader2 } from "lucide-react";

type Props = {
  disabled: boolean;
  busy: boolean;
  uploading: boolean;
  sufficient: boolean;
  onProcess: () => void;
  /** Owner-gated: when false the quality control is hidden and standard is used. */
  canUseHighQuality?: boolean;
  quality?: "standard" | "high";
  onQualityChange?: (quality: "standard" | "high") => void;
};

export function TwinReviewActions({
  disabled,
  busy,
  uploading,
  sufficient,
  onProcess,
  canUseHighQuality = false,
  quality = "standard",
  onQualityChange,
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
      {canUseHighQuality && onQualityChange ? (
        <div
          className="mb-2 grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label="Processing quality"
          data-twin-review="quality"
        >
          {(
            [
              ["standard", "Standard", "Faster"],
              ["high", "High", "Best detail"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={quality === value}
              disabled={busy || uploading}
              onClick={() => onQualityChange(value)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors ${
                quality === value
                  ? "border-[var(--twin360-blue)] bg-white/[0.06] text-[var(--graphite-text-header)]"
                  : "border-white/10 bg-white/[0.04] text-[var(--graphite-muted)] hover:bg-white/[0.06]"
              }`}
            >
              {label}
              <span className="text-[10px] font-normal text-[var(--graphite-muted)]">{hint}</span>
            </button>
          ))}
        </div>
      ) : null}
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
