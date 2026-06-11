"use client";

import { Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  recording: boolean;
  transcribing: boolean;
  dictationDisabled: boolean;
  onToggleDictation: () => void;
  aiState: "idle" | "formatting" | "blocked" | "error";
  notesEmpty: boolean;
  onBoostWithAi: () => void;
  keyboardOffset: number;
  actionBarHeightPx: number;
};

export function CaptureV2NoteAccessoryRow({
  recording,
  transcribing,
  dictationDisabled,
  onToggleDictation,
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
          onClick={onToggleDictation}
          disabled={dictationDisabled || transcribing}
          className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 ${
            recording
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_90%,transparent)] text-[var(--graphite-text-header)]"
          }`}
          data-note-review="dictate-button"
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {transcribing ? "Transcribing…" : recording ? "Stop dictation" : "Dictate note"}
        </button>
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
