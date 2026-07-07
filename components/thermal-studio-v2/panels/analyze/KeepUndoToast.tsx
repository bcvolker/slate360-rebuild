"use client";

import { useEffect, useState } from "react";

const AUTO_KEEP_MS = 10_000;

/**
 * The Keep/Undo toast every batch action must show (doc §0.1): a preview of
 * what changed, then Keep or Undo, with a 10s timeout that defaults to Keep.
 */
export function KeepUndoToast({
  message,
  onKeep,
  onUndo,
}: {
  message: string;
  onKeep: () => void;
  onUndo: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(AUTO_KEEP_MS / 1000));

  useEffect(() => {
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const timeout = setTimeout(onKeep, AUTO_KEEP_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] px-4 py-2.5 shadow-lg"
    >
      <span className="text-xs text-[var(--graphite-text-header)]">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onKeep}
        title={`Keeps automatically in ${secondsLeft}s`}
        className="rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_85%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--graphite-canvas)]"
      >
        Keep ({secondsLeft}s)
      </button>
    </div>
  );
}
