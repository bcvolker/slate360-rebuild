"use client";

import type { ReactElement } from "react";

export function KitchenAppearanceStatus({
  preparing,
  timedOut,
  onRetry,
}: {
  preparing: boolean;
  timedOut: boolean;
  onRetry: () => void;
}): ReactElement | null {
  if (!preparing && !timedOut) return null;
  return (
    <div className="pointer-events-none absolute bottom-20 right-4 z-30 sm:bottom-4 sm:right-auto sm:left-4">
      {preparing ? (
        <p
          data-testid="preparing-reality"
          className="kv-hint pointer-events-none px-2 py-1"
        >
          Preparing Reality
        </p>
      ) : null}
      {timedOut ? (
        <button
          type="button"
          data-testid="appearance-retry"
          className="kv-btn pointer-events-auto"
          onClick={onRetry}
        >
          Retry Reality
        </button>
      ) : null}
    </div>
  );
}
