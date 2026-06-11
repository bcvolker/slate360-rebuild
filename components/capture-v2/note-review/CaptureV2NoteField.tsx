"use client";

import { Loader2, Mic, MicOff } from "lucide-react";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  notes: string;
  onNotesChange: (value: string) => void;
  onNotesFocus: () => void;
  onNotesBlur: () => void;
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  dictationError: string | null;
  aiMessage: string | null;
  dictationRecording?: boolean;
  dictationTranscribing?: boolean;
  dictationDisabled?: boolean;
  onToggleDictation?: () => void;
};

export function CaptureV2NoteField({
  notes,
  onNotesChange,
  onNotesFocus,
  onNotesBlur,
  notesRef,
  dictationError,
  aiMessage,
  dictationRecording = false,
  dictationTranscribing = false,
  dictationDisabled = false,
  onToggleDictation,
}: Props) {
  return (
    <section className={`${noteReviewTokens.margin} pb-2 pt-2`} data-note-review="note-card">
      <div className={noteReviewTokens.sectionCard}>
        <div className="flex items-center justify-between gap-2">
          <span className={noteReviewTokens.sectionLabel}>Field note</span>
          {onToggleDictation ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onTouchStart={(event) => event.preventDefault()}
              onClick={onToggleDictation}
              disabled={dictationDisabled || dictationTranscribing}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                dictationRecording
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]"
              }`}
              data-note-review="dictate-button"
            >
              {dictationTranscribing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : dictationRecording ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              {dictationTranscribing
                ? "Transcribing…"
                : dictationRecording
                  ? "Stop — add to note"
                  : "Voice-to-text"}
            </button>
          ) : null}
        </div>
        <textarea
        ref={notesRef}
        name="field-notes"
        data-testid="note-review-field"
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        onFocus={onNotesFocus}
        onBlur={onNotesBlur}
        rows={5}
        placeholder="Type what happened, what changed, and who owns the next action…"
        className={`mt-2 ${noteReviewTokens.fieldInput} min-h-[120px]`}
        style={{ WebkitUserSelect: "text", userSelect: "text" }}
      />
        {(dictationError || aiMessage) && (
          <p className="mt-1.5 text-xs text-[var(--graphite-muted)]">{dictationError ?? aiMessage}</p>
        )}
      </div>
    </section>
  );
}
