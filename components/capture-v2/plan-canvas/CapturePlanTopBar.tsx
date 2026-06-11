"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { CAPTURE_PLAN_CANVAS_CHROME } from "@/lib/site-walk/capture-plan-canvas-tokens";
import { CAPTURE_V2_LAYERS } from "../layers";

type Props = {
  sheetLabel: string;
  sheetPosition: string;
  hidden?: boolean;
  onOpenSheetPicker: () => void;
  showFilmstripToggle?: boolean;
  filmstripExpanded?: boolean;
  onFilmstripToggle?: () => void;
  filmstripPanel?: ReactNode;
};

export function CapturePlanTopBar({
  sheetLabel,
  sheetPosition,
  hidden = false,
  onOpenSheetPicker,
  showFilmstripToggle = false,
  filmstripExpanded = false,
  onFilmstripToggle,
  filmstripPanel,
}: Props) {
  const router = useRouter();
  if (hidden) return null;

  return (
    <header
      className={`${CAPTURE_V2_LAYERS.taskHeader} pointer-events-auto absolute inset-x-0 top-0 z-30`}
      data-capture-chrome="plan-top-bar"
      style={{
        paddingTop: `max(env(safe-area-inset-top), ${CAPTURE_PLAN_CANVAS_CHROME.topInsetPx}px)`,
        paddingLeft: CAPTURE_PLAN_CANVAS_CHROME.sideInsetPx,
        paddingRight: CAPTURE_PLAN_CANVAS_CHROME.sideInsetPx,
      }}
    >
      <div
        className="flex items-center gap-2 border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-2 backdrop-blur-md"
        style={{
          borderRadius: CAPTURE_PLAN_CANVAS_CHROME.topBarRadiusPx,
          height: CAPTURE_PLAN_CANVAS_CHROME.planTopBarHeightPx,
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/site-walk")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          aria-label="Back to Site Walk home"
          data-capture-chrome="plan-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onOpenSheetPicker}
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 text-[var(--graphite-text-header)] transition active:scale-[0.98]"
          data-capture-chrome="plan-sheet-pill"
        >
          <span className="truncate text-[11px] font-semibold tracking-wide text-[var(--graphite-text-body)]">
            {sheetLabel} · {sheetPosition}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
        </button>

        {showFilmstripToggle ? (
          <button
            type="button"
            onClick={onFilmstripToggle}
            data-capture-chrome="plan-filmstrip-toggle"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
            aria-expanded={filmstripExpanded}
            aria-label={filmstripExpanded ? "Hide stop tracker" : "Show stop tracker"}
          >
            {filmstripExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : null}

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
