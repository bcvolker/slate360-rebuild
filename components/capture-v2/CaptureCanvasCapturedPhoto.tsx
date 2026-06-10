"use client";

import { isMarkupData, type MarkupData } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { CAPTURE_V2_LAYERS } from "./layers";
import { CaptureV2PhotoMarkupCanvas } from "./CaptureV2PhotoMarkupCanvas";

type Props = {
  sessionId: string;
  imageUrl: string;
  markupEnabled: boolean;
  initialPins: PhotoAttachmentPin[];
  initialMarkup?: unknown;
  onMarkupChange: (markup: MarkupData) => void;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
  onPlacePin: (xPct: number, yPct: number) => void;
  onAttachHere?: (xPct: number, yPct: number) => void;
  onAttachToPin?: (pin: PhotoAttachmentPin) => void;
};

export function CaptureCanvasCapturedPhoto({
  imageUrl,
  markupEnabled,
  initialPins,
  initialMarkup,
  onMarkupChange,
  onPinsChange,
  onPlacePin,
  onAttachHere,
  onAttachToPin,
}: Props) {
  const markup = isMarkupData(initialMarkup) ? initialMarkup : undefined;

  return (
    <div
      className={`absolute inset-0 ${CAPTURE_V2_LAYERS.canvas} [&_.relative]:!h-full [&_.relative]:!min-h-0 [&_img]:!max-h-full [&_img]:!max-w-full`}
    >
      <CaptureV2PhotoMarkupCanvas
        imageUrl={imageUrl}
        markupEnabled={markupEnabled}
        initialMarkup={markup}
        attachmentPins={initialPins}
        onAttachmentPinsChange={onPinsChange}
        onMarkupChange={onMarkupChange}
        onPlacePin={onPlacePin}
        onAttachHere={onAttachHere}
        onAttachToPin={onAttachToPin}
      />
    </div>
  );
}
