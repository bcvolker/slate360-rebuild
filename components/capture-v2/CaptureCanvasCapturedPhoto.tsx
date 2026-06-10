"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { isMarkupData, type MarkupData } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { PhotoMarkupCanvas } from "@/components/site-walk/capture/PhotoMarkupCanvas";
import { CAPTURE_V2_LAYERS } from "./layers";

const ATTACH_HOLD_MS = 550;
const ATTACH_MOVE_CANCEL_PX = 8;

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
  onAttachHere?: (xPct: number, yPct: number) => void;
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
  onAttachHere,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const attachHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachOriginRef = useRef<{ x: number; y: number } | null>(null);
  const attachFiredRef = useRef(false);

  const attachHereEnabled = Boolean(onAttachHere) && !markupEnabled && !pinMode;

  function clearAttachHold() {
    if (attachHoldRef.current) {
      clearTimeout(attachHoldRef.current);
      attachHoldRef.current = null;
    }
  }

  const pointFromEvent = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    if (xPct < 0 || yPct < 0 || xPct > 100 || yPct > 100) return null;
    return { xPct, yPct };
  }, []);

  const handleAttachPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!attachHereEnabled || !onAttachHere) return;
      attachFiredRef.current = false;
      attachOriginRef.current = { x: event.clientX, y: event.clientY };
      clearAttachHold();
      const point = pointFromEvent(event);
      if (!point) return;
      attachHoldRef.current = setTimeout(() => {
        attachFiredRef.current = true;
        onAttachHere(point.xPct, point.yPct);
      }, ATTACH_HOLD_MS);
    },
    [attachHereEnabled, onAttachHere, pointFromEvent],
  );

  const handleAttachPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const origin = attachOriginRef.current;
    if (!origin || !attachHoldRef.current) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > ATTACH_MOVE_CANCEL_PX) {
      clearAttachHold();
    }
  }, []);

  const handleAttachPointerEnd = useCallback(() => {
    clearAttachHold();
    attachOriginRef.current = null;
  }, []);

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
      {attachHereEnabled ? (
        <div
          className="absolute inset-0 z-[4] touch-none"
          onPointerDown={handleAttachPointerDown}
          onPointerMove={handleAttachPointerMove}
          onPointerUp={handleAttachPointerEnd}
          onPointerCancel={handleAttachPointerEnd}
          onPointerLeave={handleAttachPointerEnd}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
