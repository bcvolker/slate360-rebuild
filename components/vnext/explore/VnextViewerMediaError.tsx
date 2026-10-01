"use client";

/** One concise, shared failure treatment for a viewer whose media fails to load in the browser
 *  after the server already resolved it successfully — distinct from VnextExploreErrorState, which
 *  covers a SERVER-side resolution failure. `onRetry` should genuinely re-fetch the source, not
 *  just re-render the same broken state. */
export function VnextViewerMediaError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--graphite-canvas)] px-6 text-center"
      role="alert"
      data-vnext-viewer-media-error="true"
    >
      <p className="text-sm text-zinc-300">This view couldn&apos;t be loaded.</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-11 min-w-[88px] items-center justify-center border border-white/15 px-4 text-sm font-medium text-white"
      >
        Retry
      </button>
    </div>
  );
}
