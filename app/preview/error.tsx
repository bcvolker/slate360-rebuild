"use client";

export default function PreviewSegmentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--graphite-canvas)] px-6 text-center">
      <p className="text-sm text-[var(--graphite-text-header)]">This preview could not load.</p>
      <button type="button" className="mt-4 min-h-11 text-sm text-[var(--graphite-primary)]" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
