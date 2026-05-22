"use client";

import { CAPTURE_V2_SMART_CHIPS } from "./types";

type Props = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  notes: string;
  onNotesChange: (value: string) => void;
  className?: string;
};

export function appendChipAtCursor(
  textarea: HTMLTextAreaElement,
  chipText: string,
  currentNotes: string,
): string {
  const start = textarea.selectionStart ?? currentNotes.length;
  const end = textarea.selectionEnd ?? start;
  const before = currentNotes.slice(0, start);
  const after = currentNotes.slice(end);
  const needsSpace = before.length > 0 && !/\s$/.test(before);
  const insert = `${needsSpace ? " " : ""}${chipText}`;
  return before + insert + after;
}

export function restoreTextareaFocus(
  textarea: HTMLTextAreaElement,
  cursorPosition: number,
) {
  requestAnimationFrame(() => {
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  });
}

export function SmartClassificationChips({
  textareaRef,
  notes,
  onNotesChange,
  className = "",
}: Props) {
  function handleChip(chipText: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      const trimmed = notes.trim();
      onNotesChange(trimmed ? `${trimmed} ${chipText}` : chipText);
      return;
    }

    const next = appendChipAtCursor(textarea, chipText, notes);
    const start = textarea.selectionStart ?? notes.length;
    const end = textarea.selectionEnd ?? start;
    const before = notes.slice(0, start);
    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const insert = `${needsSpace ? " " : ""}${chipText}`;
    const cursor = before.length + insert.length;
    onNotesChange(next);
    restoreTextareaFocus(textarea, cursor);
  }

  return (
    <div
      className={`flex gap-2 overflow-x-auto no-scrollbar ${className}`}
      role="toolbar"
      aria-label="Smart classification tags"
    >
      {CAPTURE_V2_SMART_CHIPS.filter((chip) => chip !== "Completed").map((chip) => (
        <button
          key={chip}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
          onClick={() => handleChip(chip)}
          className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-200 transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-100"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
