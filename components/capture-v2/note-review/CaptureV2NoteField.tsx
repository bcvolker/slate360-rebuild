"use client";

import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  notes: string;
  onNotesChange: (value: string) => void;
  onNotesFocus: () => void;
  onNotesBlur: () => void;
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  dictationError: string | null;
  aiMessage: string | null;
};

export function CaptureV2NoteField({
  notes,
  onNotesChange,
  onNotesFocus,
  onNotesBlur,
  notesRef,
  dictationError,
  aiMessage,
}: Props) {
  return (
    <section className={`${noteReviewTokens.margin} pb-2`} data-note-review="note-card">
      <span className={noteReviewTokens.sectionLabel}>Field note</span>
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
    </section>
  );
}
