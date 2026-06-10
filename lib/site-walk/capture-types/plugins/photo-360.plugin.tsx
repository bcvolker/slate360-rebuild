"use client";

import { Orbit } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { persistPhoto360Capture } from "../persist-helpers";
import { registerCaptureType } from "../registry";
import type { CaptureThumbnailProps, CaptureTypePlugin } from "../types";

type Photo360Meta = { kind: "photo_360" };

function Photo360Thumbnail({ item, selected, stopNumber, imageUrlOverride, onSelect }: CaptureThumbnailProps) {
  const imageUrl = imageUrlOverride ?? getCaptureImageUrl(item);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={`Stop ${stopNumber}, 360 photo`}
      className={`relative flex w-[4.75rem] shrink-0 flex-col gap-1 rounded-2xl border p-1 text-left transition ${
        selected
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
          : "border-[var(--mobile-app-card-border)] bg-[var(--mobile-app-card-bg)]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--graphite-canvas)]">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--graphite-muted)]">
            <Orbit className="h-6 w-6" />
          </div>
        )}
        <div className="absolute left-1 top-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-1 py-0.5 text-[9px] font-black text-[var(--graphite-text-header)]">
          #{stopNumber}
        </div>
        <div className="absolute right-1 top-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_88%,transparent)] px-1 py-0.5 text-[8px] font-black uppercase tracking-wide text-[var(--graphite-canvas)]">
          360
        </div>
      </div>
      <p className="truncate px-0.5 text-[9px] font-bold text-[var(--graphite-muted)]">
        {item.title?.trim() || `Stop ${stopNumber}`}
      </p>
    </button>
  );
}

export const photo360CapturePlugin: CaptureTypePlugin<Photo360Meta> = registerCaptureType({
  id: "photo_360",
  label: "360 Photo",
  icon: Orbit,
  Thumbnail: Photo360Thumbnail,
  sourcePicker: { group: "media", order: 5 },
  hydrateMeta: () => ({ kind: "photo_360" as const }),
  persist: async (input, ctx) => {
    if (input.mode !== "create" || !input.blob) {
      throw new Error("360 photo capture requires a new file");
    }
    return persistPhoto360Capture(input.blob as File, ctx);
  },
});
