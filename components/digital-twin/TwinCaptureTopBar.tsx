"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Home, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

type Props = {
  headerLabel: string;
  hidden?: boolean;
  onBack: () => void;
  onToggleChrome: () => void;
  onDoneTap?: () => void;
  clipCount?: number;
  clipsExpanded?: boolean;
  onClipsToggle?: () => void;
  clipsPanel?: ReactNode;
};

export function TwinCaptureTopBar({
  headerLabel,
  hidden,
  onBack,
  onToggleChrome,
  onDoneTap,
  clipCount = 0,
  clipsExpanded = false,
  onClipsToggle,
  clipsPanel,
}: Props) {
  const router = useRouter();
  if (hidden) return null;

  const showClipsToggle = clipCount > 0 && Boolean(onClipsToggle);

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
          onClick={(event) => {
            event.stopPropagation();
            onBack();
          }}
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

        {showClipsToggle ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClipsToggle?.();
            }}
            data-twin-chrome="clips-toggle"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5 text-[var(--graphite-text-header)] transition active:scale-[0.98]"
            aria-expanded={clipsExpanded}
            aria-label={clipsExpanded ? "Hide clips" : "Show clips"}
          >
            <span className="font-mono text-[11px] font-semibold text-[var(--twin360-blue)]">
              {clipCount}
            </span>
            {clipsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleChrome();
          }}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Toggle capture controls"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {onDoneTap ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDoneTap();
            }}
            data-twin-chrome="top-bar-done"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--twin360-blue)] transition active:scale-[0.98]"
            aria-label="Finish capture"
          >
            Done
          </button>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            router.push("/app");
          }}
          data-twin-chrome="quick-exit"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Back to Slate360 home"
        >
          <Home className="h-4 w-4" />
        </button>
      </div>

      {clipsPanel ? (
        <div
          className={`w-full ${clipsExpanded ? "mt-2" : "sr-only"}`}
          aria-hidden={!clipsExpanded}
        >
          {clipsPanel}
        </div>
      ) : null}
    </header>
  );
}
