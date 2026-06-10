"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronUp, Maximize2 } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { CAPTURE_V2_LAYERS } from "./layers";

type Props = {
  headerLabel: string;
  hidden?: boolean;
  onToggleChrome: () => void;
  onBack?: () => void;
  showFilmstripToggle?: boolean;
  filmstripExpanded?: boolean;
  onFilmstripToggle?: () => void;
  filmstripPanel?: ReactNode;
};

export function CaptureCanvasTopBar({
  headerLabel,
  hidden = false,
  onToggleChrome,
  onBack,
  showFilmstripToggle = false,
  filmstripExpanded = false,
  onFilmstripToggle,
  filmstripPanel,
}: Props) {
  const router = useRouter();

  if (hidden) return null;

  return (
    <header
      data-capture-chrome="top-bar"
      className={`${CAPTURE_V2_LAYERS.taskHeader} pointer-events-auto absolute inset-x-0 top-0 z-30`}
      style={{
        paddingTop: `max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px)`,
        paddingLeft: CAPTURE_CANVAS_CHROME.sideInsetPx,
        paddingRight: CAPTURE_CANVAS_CHROME.sideInsetPx,
      }}
    >
      <div
        className="flex h-11 items-center gap-2 border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-3 backdrop-blur-md"
        style={{ borderRadius: CAPTURE_CANVAS_CHROME.topBarRadiusPx, height: CAPTURE_CANVAS_CHROME.topBarHeightPx }}
      >
        <button
          type="button"
          onClick={onBack ?? (() => router.push("/site-walk"))}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <p
          className="min-w-0 flex-1 truncate text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-primary)]"
          title={headerLabel}
        >
          {headerLabel}
        </p>

        {showFilmstripToggle ? (
          <button
            type="button"
            onClick={onFilmstripToggle}
            data-capture-chrome="filmstrip-toggle"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
            aria-expanded={filmstripExpanded}
            aria-controls="capture-canvas-stop-tracker-scroll"
            aria-label={filmstripExpanded ? "Hide stop tracker" : "Show stop tracker"}
          >
            {filmstripExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleChrome}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Toggle capture controls"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {filmstripPanel ? (
        <div
          className={`w-full ${filmstripExpanded ? "mt-2" : "sr-only"}`}
          aria-hidden={!filmstripExpanded}
        >
          {filmstripPanel}
        </div>
      ) : null}
    </header>
  );
}
