"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/lib/hooks/useCamera";
import { buildCaptureV2SummaryUrl } from "@/lib/site-walk/capture-v2-config";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { getItemPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import { VECTOR_TOOL_EVENT } from "@/components/site-walk/capture/UnifiedVectorToolbar";
import { readCaptureMarkupColor } from "./capture-canvas-markup-colors";
import { resolveCaptureV2PreviewUrl } from "./capture-v2-preview-url";
import type { CaptureV2Session } from "./session-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import { useCaptureV2SourcePicker } from "./useCaptureV2SourcePicker";
import { usePlanPinCaptureActions } from "./usePlanPinCaptureActions";

export type CaptureCanvasTool = "markup" | "pin" | "angle";

type Args = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  contextLabel: string;
  photo360Entitled: boolean;
  devOpenSourcePicker?: boolean;
  returnFromSummary?: boolean;
  planPinFlow?: {
    projectLabel: string;
    stopNumber: number;
    onReturnToPlan: () => void;
  } | null;
  initialDetailsOpen?: boolean;
};

export function useNoPlansCaptureCanvas({
  session,
  loop,
  contextLabel,
  photo360Entitled,
  devOpenSourcePicker = false,
  returnFromSummary = false,
  planPinFlow = null,
  initialDetailsOpen = false,
}: Args) {
  const router = useRouter();
  const camera = useCamera();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [activeTool, setActiveTool] = useState<CaptureCanvasTool | null>(null);
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openedReviewRef = useRef(false);

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
    if (planPinFlow) return planPinFlow.stopNumber;
    if (activeItem) {
      const index = orderedItems.findIndex(
        (item) =>
          item.id === activeItem.id ||
          (activeItem.client_item_id && item.client_item_id === activeItem.client_item_id),
      );
      if (index >= 0) return index + 1;
    }
    return orderedItems.length + 1;
  }, [activeItem, orderedItems, planPinFlow]);

  const liveHeaderLabel = planPinFlow
    ? `${planPinFlow.projectLabel.toUpperCase()} · STOP ${stopNumber}`
    : session.is_ad_hoc
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
        detail: { tool: "draw", color: readCaptureMarkupColor(), strokeWidth: 5 },
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
      loop.setIntent({ source: planPinFlow ? "plan_pin" : "quick_capture", input: "camera" });
      loop.handleFile(file, false);
      triggerHapticSuccess();
    },
    [loop, planPinFlow],
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

  const planActions = usePlanPinCaptureActions(
    loop,
    planPinFlow,
    setDetailsOpen,
    setActiveAngleId,
    setActiveTool,
    detailsOpen,
  );

  const handleShutterTapCaptured = planActions.handleShutterTapCaptured;

  const sourcePicker = useCaptureV2SourcePicker({
    sessionId: session.id,
    loop,
    camera,
    photo360Entitled,
    ingestLivePhoto: ingestFile,
  });

  const handleShutterHold = useCallback(() => {
    if (planPinFlow) return;
    sourcePicker.open({ mode: "new_stop", source: "quick_capture" });
  }, [planPinFlow, sourcePicker]);

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

  useEffect(() => {
    if (!devOpenSourcePicker) return;
    sourcePicker.open({ mode: "new_stop", source: "quick_capture" });
    // Dev-only mount helper — intentional single fire when sandbox sets picker=open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devOpenSourcePicker]);

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

  const handlePlacePin = useCallback(
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

  const handleAttachToPin = useCallback(
    (pin: PhotoAttachmentPin) => {
      if (!activeItem) return;
      sourcePicker.open({
        mode: "attach",
        source: "quick_capture",
        attachPoint: { xPct: pin.xPct, yPct: pin.yPct },
        existingPinId: pin.id,
      });
    },
    [activeItem, sourcePicker],
  );

  useEffect(() => {
    if (showPreview) return;
    if (!camera.isStreaming) void camera.startCamera(facingMode);
  }, [camera, facingMode, showPreview]);

  useEffect(() => {
    if (!returnFromSummary || !loop.activeItem || openedReviewRef.current) return;
    openedReviewRef.current = true;
    loop.focusFilmstripItem(loop.activeItem);
    setDetailsOpen(true);
  }, [loop.activeItem, loop.focusFilmstripItem, returnFromSummary, loop]);

  useEffect(() => {
    if (!initialDetailsOpen || !loop.activeItem) return;
    setDetailsOpen(true);
  }, [initialDetailsOpen, loop.activeItem]);

  const handleReviewBack = useCallback(() => {
    if (returnFromSummary) {
      router.push(buildCaptureV2SummaryUrl(session.id));
      return;
    }
    if (planActions.handleReviewBackForPlan()) return;
    setDetailsOpen(false);
  }, [planActions, returnFromSummary, router, session.id]);

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
    handlePlacePin,
    handleAttachToPin,
    handleAttachHere,
    handleReviewBack,
    planPinFlow,
    sourcePicker,
    loop,
    session,
  };
}
