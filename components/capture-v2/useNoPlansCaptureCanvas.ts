"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCamera } from "@/lib/hooks/useCamera";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { getItemPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import { VECTOR_TOOL_EVENT } from "@/components/site-walk/capture/UnifiedVectorToolbar";
import { CAPTURE_CANVAS_MARKUP_COLOR } from "./capture-canvas-markup-color";
import { resolveCaptureV2PreviewUrl } from "./capture-v2-preview-url";
import type { CaptureV2Session } from "./session-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureCanvasTool = "markup" | "pin" | "angle";

type Args = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  contextLabel: string;
};

export function useNoPlansCaptureCanvas({ session, loop, contextLabel }: Args) {
  const camera = useCamera();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [activeTool, setActiveTool] = useState<CaptureCanvasTool | null>(null);
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const markupEnabled = activeTool === "markup";
  const pinMode = activeTool === "pin";
  const showPreview = Boolean(loop.activePreview?.url);
  const previewUrl = resolveCaptureV2PreviewUrl(loop.activeItem, loop.activePreview?.url);
  const previewTitle = loop.activePreview?.title?.trim() || "Captured photo";
  const activeItem = loop.activeItem;
  const itemId = loop.activePreview?.itemId ?? activeItem?.id ?? "";

  const orderedItems = useMemo(
    () => [...loop.items].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [loop.items],
  );

  const stopNumber = useMemo(() => {
    if (activeItem) {
      const index = orderedItems.findIndex(
        (item) =>
          item.id === activeItem.id ||
          (activeItem.client_item_id && item.client_item_id === activeItem.client_item_id),
      );
      if (index >= 0) return index + 1;
    }
    return orderedItems.length + 1;
  }, [activeItem, orderedItems]);

  const liveHeaderLabel = session.is_ad_hoc
    ? `QUICK WALK · STOP ${stopNumber}`
    : `${contextLabel.toUpperCase()} · STOP ${stopNumber}`;
  const capturedHeaderLabel = `STOP ${stopNumber} · SAVED ✓`;

  const displayUrl = useMemo(() => {
    if (!showPreview || !loop.activePreview) return previewUrl;
    if (activeAngleId && activeItem) {
      return getPhotoAngleImageUrl(activeItem, activeAngleId) ?? previewUrl;
    }
    return previewUrl;
  }, [activeAngleId, activeItem, loop.activePreview, previewUrl, showPreview]);

  useEffect(() => {
    if (!showPreview) {
      setActiveTool(null);
      setActiveAngleId(null);
    }
  }, [showPreview]);

  useEffect(() => {
    if (!markupEnabled) return;
    window.dispatchEvent(
      new CustomEvent(VECTOR_TOOL_EVENT, {
        detail: { tool: "draw", color: CAPTURE_CANVAS_MARKUP_COLOR, strokeWidth: 5 },
      }),
    );
  }, [markupEnabled]);

  const returnToLiveCamera = useCallback(async () => {
    loop.setActivePreview(null);
    setActiveTool(null);
    if (!camera.isStreaming) {
      await camera.startCamera(facingMode);
    }
  }, [camera, facingMode, loop]);

  const ingestFile = useCallback(
    (file: File) => {
      loop.setIntent({ source: "quick_capture", input: "camera" });
      loop.handleFile(file, false);
      triggerHapticSuccess();
    },
    [loop],
  );

  const handleCanvasTap = useCallback(() => {
    if (showPreview) return;
    setChromeVisible((value) => !value);
  }, [showPreview]);

  const handleShutterTapLive = useCallback(() => {
    if (!camera.isStreaming) return;
    const result = camera.capturePhoto();
    if (!result) return;
    const file = new File([result.blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    ingestFile(file);
  }, [camera, ingestFile]);

  const handleShutterTapCaptured = useCallback(() => {
    void loop.saveAndNextStop();
    setActiveAngleId(null);
    setActiveTool(null);
  }, [loop]);

  const handleShutterHold = useCallback(() => {
    loop.openPickerDirect("upload", "quick_capture");
  }, [loop]);

  const handleSelectStop = useCallback(
    (item: CaptureItemRecord) => {
      loop.focusFilmstripItem(item);
      setActiveAngleId(null);
    },
    [loop],
  );

  const handleDeleteStop = useCallback(
    async (item: CaptureItemRecord) => {
      const result = await loop.deleteStop(item);
      if (!result.ok) return;
      if (showPreview) {
        await returnToLiveCamera();
      }
    },
    [loop, returnToLiveCamera, showPreview],
  );

  const handleSelectTool = useCallback(
    (tool: CaptureCanvasTool) => {
      if (tool === "angle") {
        setActiveTool(null);
        loop.setActivePreview(null);
        void camera.startCamera(facingMode);
        loop.addAnotherAngle();
        return;
      }
      setActiveTool((current) => (current === tool ? null : tool));
    },
    [camera, facingMode, loop],
  );

  const handleSelectMain = useCallback(() => {
    setActiveAngleId(null);
    if (!loop.activePreview || !activeItem) return;
    const url = getCaptureImageUrl(activeItem) ?? loop.activePreview.url;
    loop.setActivePreview({ url, title: loop.activePreview.title, itemId: loop.activePreview.itemId });
  }, [activeItem, loop]);

  const handleSelectAngle = useCallback(
    (angleId: string) => {
      setActiveAngleId(angleId);
      if (!loop.activePreview || !activeItem) return;
      const url = getPhotoAngleImageUrl(activeItem, angleId) ?? loop.activePreview.url;
      loop.setActivePreview({ url, title: loop.activePreview.title, itemId: loop.activePreview.itemId });
    },
    [activeItem, loop],
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
    [activeItem, loop],
  );

  const handlePinTap = useCallback(
    (xPct: number, yPct: number) => {
      if (!itemId || !activeItem) return;
      const pins = getItemPhotoAttachmentPins(activeItem);
      const newPin: PhotoAttachmentPin = {
        id: `photo-pin-${Date.now()}`,
        xPct,
        yPct,
        label: "Pin",
        note: "",
        files: [],
        createdAt: new Date().toISOString(),
      };
      void loop.savePhotoAttachmentPins(itemId, [...pins, newPin]);
      triggerHapticSuccess();
    },
    [activeItem, itemId, loop],
  );

  return {
    camera,
    facingMode,
    chromeVisible,
    setChromeVisible,
    activeTool,
    activeAngleId,
    detailsOpen,
    setDetailsOpen,
    markupEnabled,
    pinMode,
    showPreview,
    previewTitle,
    activeItem,
    itemId,
    displayUrl,
    stopNumber,
    liveHeaderLabel,
    capturedHeaderLabel,
    handleCanvasTap,
    handleShutterTapLive,
    handleShutterTapCaptured,
    handleShutterHold,
    handleSelectStop,
    handleDeleteStop,
    handleSelectTool,
    handleSelectMain,
    handleSelectAngle,
    handlePromoteAngle,
    handlePinTap,
    loop,
    session,
  };
}
