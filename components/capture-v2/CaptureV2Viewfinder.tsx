"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { isMarkupData } from "@/lib/site-walk/markup-types";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAttachmentPins } from "@/lib/site-walk/photo-attachments";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { PhotoMarkupCanvas } from "@/components/site-walk/capture/PhotoMarkupCanvas";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS, CAPTURE_V2_PIP_LAYOUT_ID } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  sessionId: string;
  loop: CaptureV2Loop;
  activeAngleId?: string | null;
  notesFocused?: boolean;
  markupEnabled?: boolean;
};

function resolvePreviewUrl(
  activePreview: NonNullable<CaptureV2Loop["activePreview"]>,
  activeItem: CaptureV2Loop["activeItem"],
  activeAngleId: string | null,
): string {
  if (activePreview.url.startsWith("blob:")) return activePreview.url;
  if (activeAngleId && activeItem) {
    const angleUrl = getPhotoAngleImageUrl(activeItem, activeAngleId);
    if (angleUrl) return angleUrl;
  }
  if (activeItem) {
    const persisted = getCaptureImageUrl(activeItem);
    if (persisted) return persisted;
  }
  return activePreview.url;
}

export function CaptureV2Viewfinder({
  sessionId,
  loop,
  activeAngleId = null,
  notesFocused = false,
  markupEnabled = true,
}: Props) {
  const { activePreview, activeItem, saveMarkupData, savePhotoAttachmentPins } = loop;
  const [imgFallback, setImgFallback] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!activePreview?.url) return null;
    return resolvePreviewUrl(activePreview, activeItem, activeAngleId);
  }, [activeAngleId, activeItem, activePreview]);

  useEffect(() => {
    setImgFallback(null);
  }, [previewUrl]);

  useEffect(() => {
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
  }, [activeItem, activePreview, loop]);

  const displayUrl = imgFallback ?? previewUrl ?? activePreview?.url ?? null;

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950`}
    >
      {!displayUrl || !activePreview ? (
        <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.08),transparent_55%),#0B0F15]" />
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden pb-24">
          {!notesFocused ? (
            <motion.div
              layoutId={CAPTURE_V2_PIP_LAYOUT_ID}
              className="absolute inset-0 overflow-hidden"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <PhotoMarkupCanvas
                imageUrl={displayUrl}
                title={activePreview.title}
                sessionId={sessionId}
                markupEnabled={markupEnabled}
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
              className={`absolute right-3 top-3 z-50 h-24 w-24 overflow-hidden rounded-xl border border-white/20 bg-black/60 shadow-2xl ${CAPTURE_V2_LAYERS.pipPreview}`}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <img
                src={displayUrl}
                alt={activePreview.title}
                className="h-full w-full object-cover"
                draggable={false}
                onError={() => {
                  if (activePreview.url && activePreview.url !== displayUrl) {
                    setImgFallback(activePreview.url);
                  }
                }}
              />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
