"use client";

import { FileUp, Orbit, Video } from "lucide-react";
import { registerCaptureType } from "../registry";
import type { CaptureThumbnailProps, CaptureTypePlugin } from "../types";

function stubThumbnail(label: string, Icon: CaptureTypePlugin["icon"]) {
  return function StubThumbnail({ item, selected, stopNumber, onSelect }: CaptureThumbnailProps) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        aria-label={`Stop ${stopNumber}, ${label}`}
        className={`relative flex w-[4.75rem] shrink-0 flex-col gap-1 rounded-2xl border p-1 text-left transition ${
          selected
            ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
            : "border-[var(--mobile-app-card-border)] bg-[var(--mobile-app-card-bg)]"
        }`}
      >
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-[var(--graphite-canvas)]">
          <Icon className="h-6 w-6 text-[var(--graphite-muted)]" />
          <div className="absolute left-1 top-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-1 py-0.5 text-[9px] font-black text-[var(--graphite-text-header)]">
            #{stopNumber}
          </div>
        </div>
        <p className="truncate px-0.5 text-[9px] font-bold text-[var(--graphite-muted)]">
          {item.title?.trim() || label}
        </p>
      </button>
    );
  };
}

function notImplemented(typeLabel: string) {
  return async (): Promise<never> => {
    throw new Error(`${typeLabel} capture is not wired yet`);
  };
}

export const videoCapturePlugin = registerCaptureType({
  id: "video",
  label: "Video",
  icon: Video,
  Thumbnail: stubThumbnail("Video", Video),
  sourcePicker: { group: "media", order: 4 },
  hydrateMeta: () => ({ kind: "video" as const }),
  persist: notImplemented("Video"),
});

export const photo360CapturePlugin = registerCaptureType({
  id: "photo_360",
  label: "360 Photo",
  icon: Orbit,
  Thumbnail: stubThumbnail("360 Photo", Orbit),
  sourcePicker: { group: "media", order: 5 },
  hydrateMeta: () => ({ kind: "photo_360" as const }),
  persist: notImplemented("360 photo"),
});

export const fileAttachmentCapturePlugin = registerCaptureType({
  id: "file_attachment",
  label: "File",
  icon: FileUp,
  Thumbnail: stubThumbnail("File", FileUp),
  sourcePicker: { group: "file", order: 6 },
  hydrateMeta: () => ({ kind: "file_attachment" as const }),
  persist: notImplemented("File attachment"),
});
