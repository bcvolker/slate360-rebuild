"use client";

import { FileText } from "lucide-react";
import { persistTextNoteCapture } from "../persist-helpers";
import { registerCaptureType } from "../registry";
import type { CaptureThumbnailProps, CaptureTypePlugin } from "../types";

type TextNoteMeta = { kind: "text_note"; text?: string };

function TextNoteThumbnail({ item, selected, stopNumber, onSelect }: CaptureThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={`Stop ${stopNumber}, text note`}
      className={`relative flex w-[4.75rem] shrink-0 flex-col gap-1 rounded-2xl border p-1 text-left transition ${
        selected
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
          : "border-[var(--mobile-app-card-border)] bg-[var(--mobile-app-card-bg)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]"
      }`}
    >
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-[var(--graphite-canvas)] ring-[3px] ring-[color-mix(in_srgb,var(--graphite-muted)_35%,transparent)] ring-offset-2 ring-offset-[var(--graphite-canvas)]">
        <FileText className="h-6 w-6 text-[var(--graphite-primary)]" />
        <div className="absolute left-1 top-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-1 py-0.5 text-[9px] font-black text-[var(--graphite-text-header)]">
          #{stopNumber}
        </div>
      </div>
      <p className="line-clamp-2 px-0.5 text-[9px] font-bold leading-tight text-[var(--graphite-muted)]">
        {item.description?.trim() || item.title?.trim() || `Stop ${stopNumber}`}
      </p>
    </button>
  );
}

export const textNoteCapturePlugin: CaptureTypePlugin<TextNoteMeta> = registerCaptureType({
  id: "text_note",
  label: "Text Note",
  icon: FileText,
  Thumbnail: TextNoteThumbnail,
  sourcePicker: { group: "note", order: 2 },
  hydrateMeta: (item) => ({
    kind: "text_note" as const,
    text: item.description ?? undefined,
  }),
  persist: async (input, ctx) => {
    const text =
      input.mode === "create"
        ? String((input.meta as TextNoteMeta).text ?? "")
        : String((input.meta as Partial<TextNoteMeta>).text ?? "");
    return persistTextNoteCapture(text, ctx, "text");
  },
});
