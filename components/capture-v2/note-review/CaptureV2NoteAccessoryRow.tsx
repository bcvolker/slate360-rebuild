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
          aria-label={recording ? "Stop dictation" : "Start dictation"}
          className={`${noteReviewTokens.micButton} ${recording ? "border-red-500/40 text-red-300" : ""}`}
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
          onClick={onBoostWithAi}
          disabled={aiState === "formatting" || notesEmpty}
          className={noteReviewTokens.aiBoostChip}
        >
          {aiState === "formatting" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Boost with AI
        </button>
        <span className="min-w-0 flex-1" aria-hidden />
      </div>
    </div>
  );
}
