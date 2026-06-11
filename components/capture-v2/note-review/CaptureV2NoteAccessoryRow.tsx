"use client";

import { Loader2, Sparkles } from "lucide-react";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  aiState: "idle" | "formatting" | "blocked" | "error";
  notesEmpty: boolean;
  onBoostWithAi: () => void;
  keyboardOffset: number;
  actionBarHeightPx: number;
};

export function CaptureV2NoteAccessoryRow({
  aiState,
  notesEmpty,
  onBoostWithAi,
  keyboardOffset,
  actionBarHeightPx,
}: Props) {
  return (
    <div
      className={`${noteReviewTokens.pinnedBar} ${noteReviewTokens.margin} py-2`}
      style={{ bottom: keyboardOffset + actionBarHeightPx }}
      data-note-review="note-accessory"
    >
      <div className="flex w-full min-w-0 items-center gap-2">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
          onClick={onBoostWithAi}
          disabled={aiState === "formatting" || notesEmpty}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,var(--surface-zinc))] px-3 text-sm font-semibold text-[color-mix(in_srgb,var(--twin360-blue)_88%,white)] transition active:scale-[0.99] disabled:opacity-50"
          data-note-review="ai-boost-button"
        >
          {aiState === "formatting" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {aiState === "formatting" ? "Boosting…" : "Boost with AI"}
        </button>
      </div>
    </div>
  );
}
