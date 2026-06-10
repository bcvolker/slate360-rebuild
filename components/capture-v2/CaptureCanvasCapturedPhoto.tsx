"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { isMarkupData, type MarkupData } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { PhotoMarkupCanvas } from "@/components/site-walk/capture/PhotoMarkupCanvas";
import { CAPTURE_V2_LAYERS } from "./layers";

type Props = {
  sessionId: string;
  imageUrl: string;
  title: string;
  markupEnabled: boolean;
  pinMode: boolean;
  initialPins: PhotoAttachmentPin[];
  initialMarkup?: unknown;
  onMarkupChange: (markup: MarkupData) => void;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
  onPinTap: (xPct: number, yPct: number) => void;
};

export function CaptureCanvasCapturedPhoto({
  sessionId,
  imageUrl,
  title,
  markupEnabled,
  pinMode,
  initialPins,
  initialMarkup,
  onMarkupChange,
  onPinsChange,
  onPinTap,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePinOverlayPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!pinMode || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xPct = ((event.clientX - rect.left) / rect.width) * 100;
      const yPct = ((event.clientY - rect.top) / rect.height) * 100;
      if (xPct < 0 || yPct < 0 || xPct > 100 || yPct > 100) return;
      onPinTap(xPct, yPct);
    },
    [pinMode, onPinTap],
  );

  const markup = isMarkupData(initialMarkup) ? initialMarkup : undefined;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${CAPTURE_V2_LAYERS.canvas} [&_.relative]:!h-full [&_.relative]:!min-h-0 [&_img]:!max-h-full [&_img]:!max-w-full`}
    >
      <PhotoMarkupCanvas
        imageUrl={imageUrl}
        title={title}
        sessionId={sessionId}
        markupEnabled={markupEnabled}
        initialMarkup={markup}
        attachmentPins={initialPins}
        onAttachmentPinsChange={onPinsChange}
        onMarkupChange={onMarkupChange}
      />
      {pinMode ? (
        <div
          className="absolute inset-0 z-[5] touch-none"
          onPointerUp={handlePinOverlayPointerUp}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
