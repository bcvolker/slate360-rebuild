"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { isMarkupData } from "@/lib/site-walk/markup-types";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAttachmentPins } from "@/lib/site-walk/photo-attachments";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { CaptureUploadBadge } from "@/components/site-walk/capture/CaptureUploadBadge";
import { PhotoMarkupCanvas } from "@/components/site-walk/capture/PhotoMarkupCanvas";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS, CAPTURE_V2_PIP_LAYOUT_ID } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  sessionId: string;
  loop: CaptureV2Loop;
  activeAngleId?: string | null;
  notesFocused?: boolean;
};

export function CaptureV2Viewfinder({ sessionId, loop, activeAngleId = null, notesFocused = false }: Props) {
  const { activePreview, activeItem, status, saveMarkupData, savePhotoAttachmentPins } = loop;

  const previewUrl = useMemo(() => {
    if (!activePreview) return null;
    if (activeAngleId && activeItem) {
      return getPhotoAngleImageUrl(activeItem, activeAngleId) ?? activePreview.url;
    }
    return activePreview.url;
  }, [activeAngleId, activeItem, activePreview]);

  useEffect(() => {
    if (status.kind !== "complete" && status.kind !== "idle") return;
    if (!activePreview?.url.startsWith("blob:")) return;
    const persistedUrl = activeItem ? getCaptureImageUrl(activeItem) : null;
    if (persistedUrl && persistedUrl !== activePreview.url && !persistedUrl.startsWith("blob:")) {
      URL.revokeObjectURL(activePreview.url);
      loop.setActivePreview({
        url: persistedUrl,
        title: activePreview.title,
        itemId: activePreview.itemId,
      });
    }
  }, [activeItem, activePreview, loop, status.kind]);

  if (!activePreview || !previewUrl) {
    return (
      <div
        id={CAPTURE_V2_LAYER_IDS.canvasBase}
        className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center`}
      >
        <p className="text-sm font-semibold text-slate-400">
          Capture from the hub or fast-track bar to preview here instantly.
        </p>
      </div>
    );
  }

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden pb-24">
        {!notesFocused ? (
          <motion.div
            layoutId={CAPTURE_V2_PIP_LAYOUT_ID}
            className="absolute inset-0 overflow-hidden"
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <PhotoMarkupCanvas
              imageUrl={previewUrl}
              title={activePreview.title}
              sessionId={sessionId}
              markupEnabled
              initialMarkup={isMarkupData(activeItem?.markup_data) ? activeItem.markup_data : undefined}
              attachmentPins={getItemPhotoAttachmentPins(activeItem)}
              onAttachmentPinsChange={(pins) => {
                void savePhotoAttachmentPins(activePreview.itemId, pins);
              }}
              onMarkupChange={(markup) => {
                void saveMarkupData(activePreview.itemId, markup);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            layoutId={CAPTURE_V2_PIP_LAYOUT_ID}
            className={`absolute right-3 top-3 ${CAPTURE_V2_LAYERS.pipPreview} h-24 w-24 overflow-hidden rounded-xl border border-white/20 bg-black/60 shadow-2xl`}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <img
              src={previewUrl}
              alt={activePreview.title}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </motion.div>
        )}
        <CaptureUploadBadge kind={status.kind} />
      </div>
    </div>
  );
}
