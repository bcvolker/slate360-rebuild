"use client";

import type { ReactElement } from "react";

export function KitchenAppearanceStatus({
  message,
  retry,
  onRetry,
}: {
  message: string | null;
  retry: boolean;
  onRetry: () => void;
}): ReactElement | null {
  if (!message) return null;
  return (
    <div className="pointer-events-none absolute bottom-20 left-4 z-30 sm:bottom-16">
      <p data-testid="preparing-reality" className="kv-hint pointer-events-none px-2 py-1">
        {message}
      </p>
      {retry ? (
        <button
          type="button"
          data-testid="appearance-retry"
          className="kv-btn pointer-events-auto mt-2"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
