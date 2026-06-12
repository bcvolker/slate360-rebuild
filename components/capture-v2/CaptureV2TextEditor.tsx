"use client";

import { useEffect, type RefObject } from "react";
import { Check } from "lucide-react";
import type { MarkupShape } from "@/lib/site-walk/markup-types";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";

type Props = {
  shape?: MarkupShape;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onDone: () => void;
};

/**
 * Markup text entry — a fixed bar pinned to the top of the photo stage instead
 * of an input floating at the tap point (which zoom misplaces and the iOS
 * keyboard covers). The input element is mounted persistently by the canvas so
 * the text tool can focus it synchronously inside the original tap gesture —
 * the only reliable way to open the iOS keyboard. The SVG text under the bar
 * live-updates as the user types.
 */
export function CaptureV2TextEditor({ shape, inputRef, onChange, onDone }: Props) {
  const editing = Boolean(shape && shape.kind === "text");

  // Re-assert focus once the bar becomes visible (no-op when the gesture focus
  // already landed; rescues desktop/pointer flows where it didn't).
  useEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true });
  }, [editing, inputRef]);

  return (
    <div
      className={`absolute inset-x-2 top-2 z-30 flex items-center gap-2 p-1.5 ${captureCanvasGlass.surface} ${captureCanvasGlass.radiusMd} ${editing ? "" : "pointer-events-none opacity-0"}`}
      data-capture-chrome="markup-text-editor"
      aria-hidden={!editing}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={shape && shape.kind === "text" ? shape.text : ""}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onDone();
          }
        }}
        placeholder="Type note"
        tabIndex={editing ? 0 : -1}
        className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] px-3 text-sm font-semibold text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[var(--graphite-primary)]"
        aria-label="Markup text"
        data-capture-chrome="markup-text-input"
      />
      <button
        type="button"
        onClick={onDone}
        tabIndex={editing ? 0 : -1}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] transition active:scale-[0.98]"
        aria-label="Done with text"
        data-capture-chrome="markup-text-done"
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
