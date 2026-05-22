"use client";

import { ChevronUp } from "lucide-react";
import { PhotoAngleStrip } from "@/components/site-walk/capture/PhotoAngleStrip";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
  activeAngleId: string | null;
  onSelectAngle: (angleId: string | null) => void;
  onOpenDrawer: () => void;
  onSaveAndNext: () => void;
  saving?: boolean;
};

export function FastTrackActionBar({
  loop,
  activeAngleId,
  onSelectAngle,
  onOpenDrawer,
  onSaveAndNext,
  saving = false,
}: Props) {
  const { activeItem, isDesktop, openPickerDirect, activePreview } = loop;

  if (!activeItem && !activePreview) return null;

  function handleSelectAngle(angleId: string | null) {
    onSelectAngle(angleId);
    if (!activePreview || !activeItem) return;
    const url =
      angleId === null
        ? getCaptureImageUrl(activeItem) ?? activePreview.url
        : getPhotoAngleImageUrl(activeItem, angleId) ?? activePreview.url;
    loop.setActivePreview({
      url,
      title: activePreview.title,
      itemId: activePreview.itemId,
    });
  }

  function handleAddAngle() {
    loop.setIntent({ source: "angle", input: isDesktop ? "upload" : "camera" });
    openPickerDirect(isDesktop ? "upload" : "camera", "angle");
  }

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.fastTrackBar}
      className={`pointer-events-auto absolute inset-x-0 bottom-0 ${CAPTURE_V2_LAYERS.fastTrack} border-t border-white/10 bg-slate-950/92 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-xl`}
    >
      <div className="flex min-h-11 items-center gap-2">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200 hover:border-amber-400/35"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Add Log Details
        </button>

        <div className="min-w-0 flex-1">
          <PhotoAngleStrip
            item={activeItem}
            activeAngleId={activeAngleId}
            className="border-0 bg-transparent p-0 shadow-none"
            onSelectAngle={handleSelectAngle}
            onAddAngle={handleAddAngle}
          />
        </div>

        <button
          type="button"
          onClick={onSaveAndNext}
          disabled={saving || loop.busy}
          className="min-h-11 shrink-0 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.45)] hover:bg-amber-400 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save & Next"}
        </button>
      </div>
    </div>
  );
}
