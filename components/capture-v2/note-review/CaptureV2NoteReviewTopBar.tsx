"use client";

import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  stopNumber: number;
  onBack: () => void;
  stripOpen?: boolean;
  onToggleStrip?: () => void;
};

export function CaptureV2NoteReviewTopBar({ stopNumber, onBack, stripOpen, onToggleStrip }: Props) {
  return (
    <header
      className={`${noteReviewTokens.margin} shrink-0 pt-[max(env(safe-area-inset-top),8px)] pb-2`}
      data-note-review="top-bar"
    >
      <div
        className={`flex h-11 items-center gap-2 ${noteReviewTokens.glassBar} ${noteReviewTokens.glassBarRadius} px-2`}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] active:scale-[0.98]"
          aria-label="Back to capture"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {onToggleStrip ? (
          <button
            type="button"
            onClick={onToggleStrip}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg py-1 ${noteReviewTokens.monoGreenLabel}`}
            aria-expanded={stripOpen}
            aria-label={stripOpen ? "Hide stop switcher" : "Show stop switcher"}
            data-note-review="stop-strip-toggle"
          >
            <span className="truncate">STOP {stopNumber} · DETAILS</span>
            {stripOpen ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>
        ) : (
          <p className={`min-w-0 flex-1 text-center ${noteReviewTokens.monoGreenLabel}`}>
            STOP {stopNumber} · DETAILS
          </p>
        )}
        <span className="h-9 w-9 shrink-0" aria-hidden />
      </div>
    </header>
  );
}
