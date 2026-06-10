"use client";

import { useCallback } from "react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { getItemPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import type { useCaptureV2SourcePicker } from "./useCaptureV2SourcePicker";

type SourcePicker = ReturnType<typeof useCaptureV2SourcePicker>;

type Args = {
  loop: CaptureV2Loop;
  activeItem: CaptureItemRecord | null;
  itemId: string;
  sourcePicker: SourcePicker;
  setActiveAngleId: (id: string | null) => void;
};

export function useCaptureCanvasPhotoActions({
  loop,
  activeItem,
  itemId,
  sourcePicker,
  setActiveAngleId,
}: Args) {
  const handleSelectMain = useCallback(() => {
    setActiveAngleId(null);
    if (!loop.activePreview || !activeItem) return;
    const url = getCaptureImageUrl(activeItem) ?? loop.activePreview.url;
    loop.setActivePreview({ url, title: loop.activePreview.title, itemId: loop.activePreview.itemId });
  }, [activeItem, loop, setActiveAngleId]);

  const handleSelectAngle = useCallback(
    (angleId: string) => {
      setActiveAngleId(angleId);
      if (!loop.activePreview || !activeItem) return;
      const url = getPhotoAngleImageUrl(activeItem, angleId) ?? loop.activePreview.url;
      loop.setActivePreview({ url, title: loop.activePreview.title, itemId: loop.activePreview.itemId });
    },
    [activeItem, loop, setActiveAngleId],
  );

  const handlePromoteAngle = useCallback(
    (angleId: string) => {
      if (!loop.activePreview || !activeItem) return;
      const url = getPhotoAngleImageUrl(activeItem, angleId);
      if (!url) return;
      setActiveAngleId(null);
      loop.setActivePreview({ url, title: loop.activePreview.title, itemId: loop.activePreview.itemId });
      triggerHapticSuccess();
    },
    [activeItem, loop, setActiveAngleId],
  );

  const handlePlacePin = useCallback(
    (xPct: number, yPct: number) => {
      if (!itemId || !activeItem) return;
      const pins = getItemPhotoAttachmentPins(activeItem);
      const newPin: PhotoAttachmentPin = {
        id: `photo-pin-${Date.now()}`,
        xPct,
        yPct,
        label: "Untitled",
        note: "",
        files: [],
        createdAt: new Date().toISOString(),
      };
      void loop.savePhotoAttachmentPins(itemId, [...pins, newPin]);
      triggerHapticSuccess();
    },
    [activeItem, itemId, loop],
  );

  const handleAttachHere = useCallback(
    (xPct: number, yPct: number) => {
      if (!activeItem) return;
      sourcePicker.open({
        mode: "attach",
        source: "quick_capture",
        attachPoint: { xPct, yPct },
      });
    },
    [activeItem, sourcePicker],
  );

  const handleAttachFileToPin = useCallback(
    (pin: PhotoAttachmentPin) => {
      if (!activeItem) return;
      sourcePicker.attachToPin(pin, "file");
    },
    [activeItem, sourcePicker],
  );

  const handleAttachPhotoToPin = useCallback(
    (pin: PhotoAttachmentPin) => {
      if (!activeItem) return;
      sourcePicker.attachToPin(pin, "photo");
    },
    [activeItem, sourcePicker],
  );

  return {
    handleSelectMain,
    handleSelectAngle,
    handlePromoteAngle,
    handlePlacePin,
    handleAttachHere,
    handleAttachFileToPin,
    handleAttachPhotoToPin,
  };
}
