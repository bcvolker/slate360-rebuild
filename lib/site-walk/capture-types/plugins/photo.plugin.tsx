"use client";

import { Camera } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { persistPhotoCapture } from "../persist-helpers";
import { registerCaptureType } from "../registry";
import type { CaptureThumbnailProps, CaptureTypePlugin } from "../types";

type PhotoMeta = { kind: "photo" };

function PhotoThumbnail({ item, selected, stopNumber, imageUrlOverride, onSelect }: CaptureThumbnailProps) {
  const imageUrl = imageUrlOverride ?? getCaptureImageUrl(item);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={`Stop ${stopNumber}, photo`}
      className={`relative flex w-[4.75rem] shrink-0 flex-col gap-1 rounded-2xl border p-1 text-left transition ${
        selected
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] shadow-[var(--mobile-app-card-shadow)]"
          : "border-[var(--mobile-app-card-border)] bg-[var(--mobile-app-card-bg)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--graphite-canvas)] ring-[3px] ring-[color-mix(in_srgb,var(--graphite-muted)_35%,transparent)] ring-offset-2 ring-offset-[var(--graphite-canvas)]">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--graphite-muted)]">
            <Camera className="h-5 w-5" />
          </div>
        )}
        <div className="absolute left-1 top-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-1 py-0.5 text-[9px] font-black text-[var(--graphite-text-header)]">
          #{stopNumber}
        </div>
      </div>
      <p className="truncate px-0.5 text-[9px] font-bold leading-tight text-[var(--graphite-muted)]">
        {item.title?.trim() || `Stop ${stopNumber}`}
      </p>
    </button>
  );
}

export const photoCapturePlugin: CaptureTypePlugin<PhotoMeta> = registerCaptureType({
  id: "photo",
  label: "Photo",
  icon: Camera,
  Thumbnail: PhotoThumbnail,
  sourcePicker: { group: "media", order: 1 },
  hydrateMeta: () => ({ kind: "photo" as const }),
  persist: async (input, ctx) => {
    if (input.mode !== "create" || !input.blob) {
      throw new Error("Photo capture requires a new file");
    }
    const title =
      typeof input.meta === "object" && input.meta && "title" in input.meta
        ? String((input.meta as { title?: string }).title ?? "")
        : "";
    return persistPhotoCapture(input.blob as File, ctx, title);
  },
});
