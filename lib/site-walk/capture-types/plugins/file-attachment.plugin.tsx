"use client";

import { FileUp } from "lucide-react";
import { persistFileAttachmentCapture } from "../persist-helpers";
import { registerCaptureType } from "../registry";
import type { CaptureThumbnailProps, CaptureTypePlugin } from "../types";

type FileAttachmentMeta = { kind: "file_attachment" };

function FileAttachmentThumbnail({ item, selected, stopNumber, onSelect }: CaptureThumbnailProps) {
  const metadata =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>)
      : null;
  const originalName =
    typeof metadata?.original_filename === "string" ? metadata.original_filename : null;
  const label = item.title?.trim() || originalName || "File";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={`Stop ${stopNumber}, file`}
      className={`relative flex w-[4.75rem] shrink-0 flex-col gap-1 rounded-2xl border p-1 text-left transition ${
        selected
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
          : "border-[var(--mobile-app-card-border)] bg-[var(--mobile-app-card-bg)]"
      }`}
    >
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-[var(--graphite-canvas)] px-1">
        <FileUp className="h-6 w-6 shrink-0 text-[var(--graphite-muted)]" />
        <div className="absolute left-1 top-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-1 py-0.5 text-[9px] font-black text-[var(--graphite-text-header)]">
          #{stopNumber}
        </div>
      </div>
      <p className="truncate px-0.5 text-[9px] font-bold text-[var(--graphite-muted)]">{label}</p>
    </button>
  );
}

export const fileAttachmentCapturePlugin: CaptureTypePlugin<FileAttachmentMeta> = registerCaptureType({
  id: "file_attachment",
  label: "File",
  icon: FileUp,
  Thumbnail: FileAttachmentThumbnail,
  sourcePicker: { group: "file", order: 6 },
  hydrateMeta: () => ({ kind: "file_attachment" as const }),
  persist: async (input, ctx) => {
    if (input.mode !== "create" || !input.blob) {
      throw new Error("File attachment capture requires a new file");
    }
    return persistFileAttachmentCapture(input.blob as File, ctx);
  },
});
