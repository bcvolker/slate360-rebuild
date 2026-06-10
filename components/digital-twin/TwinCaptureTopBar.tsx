"use client";

import { ChevronLeft, Maximize2 } from "lucide-react";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  headerLabel: string;
  hidden?: boolean;
  onBack: () => void;
  onToggleChrome: () => void;
};

export function TwinCaptureTopBar({ headerLabel, hidden, onBack, onToggleChrome }: Props) {
  if (hidden) return null;

  return (
    <header
      className="pointer-events-auto absolute inset-x-0 top-0 z-30"
      style={{
        paddingTop: `max(env(safe-area-inset-top), ${TWIN_CAPTURE_CHROME.topInsetPx}px)`,
        paddingLeft: TWIN_CAPTURE_CHROME.sideInsetPx,
        paddingRight: TWIN_CAPTURE_CHROME.sideInsetPx,
      }}
    >
      <div
        className="flex items-center gap-2 border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_85%,transparent)] px-3 backdrop-blur-md"
        style={{
          borderRadius: TWIN_CAPTURE_CHROME.topBarRadiusPx,
          height: TWIN_CAPTURE_CHROME.topBarHeightPx,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <p
          className="min-w-0 flex-1 truncate text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--twin360-blue)]"
          title={headerLabel}
        >
          {headerLabel}
        </p>

        <button
          type="button"
          onClick={onToggleChrome}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Toggle capture controls"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
