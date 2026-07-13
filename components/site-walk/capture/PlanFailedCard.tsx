"use client";

type Props = {
  errorText?: string | null;
  retrying: boolean;
  onRetry: () => void;
  onContinueWithCamera?: () => void;
};

export function PlanFailedCard({ errorText, retrying, onRetry, onContinueWithCamera }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-black text-[var(--graphite-text-header)]">
        This plan couldn&apos;t be processed
      </p>
      <p className="max-w-xs text-xs font-semibold text-[var(--graphite-muted)]">
        {errorText || "Something went wrong converting the drawing."}
      </p>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="rounded-lg bg-[var(--graphite-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {retrying ? "Retrying…" : "Retry"}
        </button>
        {onContinueWithCamera ? (
          <button
            type="button"
            onClick={onContinueWithCamera}
            className="rounded-lg border border-[var(--graphite-border)] px-4 py-2 text-xs font-bold text-[var(--graphite-text-header)]"
          >
            Continue with camera
          </button>
        ) : null}
      </div>
    </div>
  );
}
