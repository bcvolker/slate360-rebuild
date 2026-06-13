"use client";

import { Flag } from "lucide-react";

type Props = {
  open: boolean;
  ending: boolean;
  error?: string | null;
  onClose: () => void;
  onExit: () => void;
  onEnd: () => void;
};

export function SessionExitModal({ open, ending, error = null, onClose, onExit, onEnd }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={ending ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,white)] p-5 text-[var(--graphite-text-header)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Leave this walk?</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--graphite-muted)]">
              Everything you&apos;ve captured is already saved.{" "}
              <span className="font-semibold text-[var(--graphite-text-body)]">End Walk</span>{" "}
              completes the walk and opens the review.{" "}
              <span className="font-semibold text-[var(--graphite-text-body)]">Exit</span> keeps
              it in progress so you can resume later.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onClose}
            disabled={ending}
            className="min-h-11 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_5%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--graphite-text-body)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExit}
            disabled={ending}
            className="min-h-11 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_8%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--graphite-text-header)] disabled:opacity-60"
          >
            Exit
          </button>
          <button
            type="button"
            onClick={onEnd}
            disabled={ending}
            className="min-h-11 rounded-xl bg-[var(--graphite-primary)] px-3 py-2 text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-60"
          >
            {ending ? "Ending…" : "End Walk"}
          </button>
        </div>
      </div>
    </div>
  );
}
