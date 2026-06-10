"use client";

import { ChevronLeft } from "lucide-react";

type Props = {
  onBack: () => void;
};

export function TwinCaptureReviewTopBar({ onBack }: Props) {
  return (
    <header
      className="shrink-0"
      data-twin-review="top-bar"
      style={{
        paddingTop: `max(env(safe-area-inset-top), 12px)`,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div
        className="flex h-11 items-center gap-2 border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-3 backdrop-blur-md"
        style={{ borderRadius: 12 }}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)]"
          aria-label="Back to capture"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--twin360-blue)]">
          QUICK SCAN · REVIEW
        </p>
        <span className="h-8 w-8 shrink-0" aria-hidden />
      </div>
    </header>
  );
}
