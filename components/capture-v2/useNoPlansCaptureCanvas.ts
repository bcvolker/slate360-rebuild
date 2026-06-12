"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/lib/hooks/useCamera";
import { buildCaptureV2SummaryUrl } from "@/lib/site-walk/capture-v2-config";
import { compressCaptureFile } from "@/lib/site-walk/image-compression";
import { getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import { VECTOR_TOOL_EVENT } from "@/components/site-walk/capture/UnifiedVectorToolbar";
import { readCaptureMarkupColor } from "./capture-canvas-markup-colors";
import { resolveCaptureV2PreviewUrl } from "./capture-v2-preview-url";
import type { CaptureV2Session } from "./session-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import { useCaptureCanvasPhotoActions } from "./useCaptureCanvasPhotoActions";
import { useCaptureCanvasSessionExit } from "./useCaptureCanvasSessionExit";
import { useCaptureCanvasStreamLifecycle } from "./useCaptureCanvasStreamLifecycle";
import { useCaptureCanvasTorch } from "./useCaptureCanvasTorch";
import { useCaptureV2SourcePicker } from "./useCaptureV2SourcePicker";
import { usePlanPinCaptureActions } from "./usePlanPinCaptureActions";

export type CaptureCanvasTool = "markup" | "angle";

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
  const [filmstripExpanded, setFilmstripExpanded] = useState(false);
  const [ghostOn, setGhostOn] = useState(false);
  const [ghostOpacity, setGhostOpacity] = useState(0.25);
  const [facingMode] = useState<"user" | "environment">("environment");
  const [activeTool, setActiveTool] = useState<CaptureCanvasTool | null>(null);
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [captureBlocked, setCaptureBlocked] = useState(false);
  const openedReviewRef = useRef(false);

  const sessionExit = useCaptureCanvasSessionExit({
    session,
    onBeforeExit: () => camera.stopCamera(),
  });
  const torch = useCaptureCanvasTorch(camera);

  const markupEnabled = activeTool === "markup";
  const angleCaptureMode = activeTool === "angle";
  const showPreview = Boolean(loop.activePreview?.url) && !angleCaptureMode;
  const cameraPaused = (Boolean(loop.activePreview?.url) && !angleCaptureMode) || detailsOpen;
  const previewUrl = resolveCaptureV2PreviewUrl(loop.activeItem, loop.activePreview?.url);
  const activeItem = loop.activeItem;
  const itemId = loop.activePreview?.itemId ?? activeItem?.id ?? "";

  const streamLifecycle = useCaptureCanvasStreamLifecycle({ camera, facingMode, cameraPaused });

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

  // Header stays short — "STOP n" must never truncate (walk context is implicit).
  const liveHeaderLabel = planPinFlow
    ? `${planPinFlow.projectLabel.toUpperCase()} · STOP ${stopNumber}`
    : `STOP ${stopNumber}`;
  const capturedHeaderLabel = `STOP ${stopNumber} · SAVED ✓`;
  const angleHeaderLabel = `STOP ${stopNumber} · ANGLE`;

  const displayUrl = useMemo(() => {
    if (!showPreview || !loop.activePreview) return previewUrl;
    if (activeAngleId && activeItem) {
      return getPhotoAngleImageUrl(activeItem, activeAngleId) ?? previewUrl;
    }
    return previewUrl;
  }, [activeAngleId, activeItem, loop.activePreview, previewUrl, showPreview]);

  // Session ghost = previous shot only. Progression ghost (project-scoped,
  // pin-anchored picker) ships with walks-with-plans — see ghost-mode spec.
  const ghostImageUrl = useMemo(() => {
    if (orderedItems.length === 0) return null;
    const previous = orderedItems[orderedItems.length - 1];
    return resolveCaptureV2PreviewUrl(previous, null);
  }, [orderedItems]);

  const ghostAvailable = Boolean(ghostImageUrl);

  const handleGhostTap = useCallback(() => {
    if (!ghostAvailable) return;
    setGhostOn((value) => !value);
  }, [ghostAvailable]);

  useEffect(() => {
    if (!ghostAvailable) setGhostOn(false);
  }, [ghostAvailable]);

  useEffect(() => {
    if (!showPreview && activeTool !== "angle") {
      setActiveTool(null);
      setActiveAngleId(null);
    }
  }, [activeTool, showPreview]);

  useEffect(() => {
    if (showPreview) setFilmstripExpanded(false);
  }, [showPreview]);

  useEffect(() => {
    if (!markupEnabled) return;
    window.dispatchEvent(
      new CustomEvent(VECTOR_TOOL_EVENT, {
        detail: { tool: "draw", color: readCaptureMarkupColor(), strokeWidth: 5 },
      }),
    );
  }, [markupEnabled]);

  useEffect(() => {
    setCaptureBlocked(!camera.hasLiveFrames && camera.videoAttached && !camera.needsUserResume);
  }, [camera.hasLiveFrames, camera.needsUserResume, camera.videoAttached]);

  const returnToLiveCamera = useCallback(async () => {
    loop.setActivePreview(null);
    setActiveTool(null);
    if (camera.needsUserResume) return;
    if (camera.streamAlive) {
      await camera.reattachVideo();
      return;
    }
    await camera.startCamera(facingMode);
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
    // Markup/pin gestures on the captured photo bubble click events to this
    // handler (Grok audit finding) — chrome toggling is a live-framing
    // affordance only; in the captured state chrome stays visible.
    if (markupEnabled || showPreview) return;
    setChromeVisible((value) => !value);
  }, [markupEnabled, showPreview]);

  const handleShutterTapLive = useCallback(() => {
    if (!camera.streamAlive || camera.needsUserResume || !camera.hasLiveFrames) {
      setCaptureBlocked(true);
      return;
    }
    const result = camera.capturePhoto();
    if (!result) {
      setCaptureBlocked(true);
      return;
    }
    setCaptureBlocked(false);
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

  const sourcePicker = useCaptureV2SourcePicker({
    sessionId: session.id,
    loop,
    camera,
    photo360Entitled,
    ingestLivePhoto: ingestFile,
  });

  const photoActions = useCaptureCanvasPhotoActions({
    loop,
    activeItem,
    itemId,
    sourcePicker,
    setActiveAngleId,
  });

  const handleShutterHold = useCallback(() => {
    if (planPinFlow) return;
    sourcePicker.open({ mode: "new_stop", source: "quick_capture" });
  }, [planPinFlow, sourcePicker]);

  useEffect(() => {
    if (!devOpenSourcePicker) return;
    sourcePicker.open({ mode: "new_stop", source: "quick_capture" });
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
      if (showPreview) await returnToLiveCamera();
    },
    [loop, returnToLiveCamera, showPreview],
  );

  const enterAngleCaptureMode = useCallback(() => {
    if (!activeItem) return;
    setActiveTool("angle");
    setActiveAngleId(null);
    setCaptureBlocked(false);
    loop.setActivePreview(null);
    loop.setIntent({ source: "angle", input: "camera" });
    if (camera.needsUserResume) return;
    if (camera.streamAlive) {
      void camera.reattachVideo();
      return;
    }
    void camera.startCamera(facingMode);
  }, [activeItem, camera, facingMode, loop]);

  const handleSelectTool = useCallback(
    (tool: CaptureCanvasTool) => {
      if (tool === "angle") {
        enterAngleCaptureMode();
        return;
      }
      setActiveTool((current) => (current === tool ? null : tool));
      setChromeVisible(true);
    },
    [enterAngleCaptureMode],
  );

  const handleShutterTapAngle = useCallback(async () => {
    if (!activeItem) return;
    if (!camera.streamAlive || camera.needsUserResume || !camera.hasLiveFrames) {
      setCaptureBlocked(true);
      return;
    }
    const result = camera.capturePhoto();
    if (!result) {
      setCaptureBlocked(true);
      return;
    }
    setCaptureBlocked(false);
    const previewUrl = URL.createObjectURL(result.blob);
    try {
      const file = new File([result.blob], `angle-${Date.now()}.jpg`, { type: "image/jpeg" });
      const compressed = await compressCaptureFile(file);
      const angleRecord = await loop.savePhotoAngle(activeItem.id, compressed, previewUrl, "camera");
      setActiveTool(null);
      const nextAngleId = angleRecord?.id ?? null;
      setActiveAngleId(nextAngleId);
      const refreshedItem = loop.activeItem ?? activeItem;
      const imageUrl =
        (nextAngleId ? getPhotoAngleImageUrl(refreshedItem, nextAngleId) : null) ??
        getPhotoAngleImageUrl(refreshedItem, null) ??
        previewUrl;
      loop.setActivePreview({
        url: imageUrl,
        title: activeItem.title?.trim() || "Captured photo",
        itemId: activeItem.id,
      });
      triggerHapticSuccess();
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      loop.setExternalError(error instanceof Error ? error.message : "Angle capture failed.");
    }
  }, [activeItem, camera, loop]);

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
    setChromeVisible(true);
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
    captureBlocked,
    markupEnabled,
    showPreview,
    filmstripExpanded,
    setFilmstripExpanded,
    ghostOn,
    ghostAvailable,
    ghostImageUrl,
    ghostOpacity,
    setGhostOpacity,
    handleGhostTap,
    hasStops: orderedItems.length > 0,
    cameraPaused,
    activeItem,
    itemId,
    displayUrl,
    stopNumber,
    liveHeaderLabel,
    capturedHeaderLabel,
    angleHeaderLabel,
    angleCaptureMode,
    handleCanvasTap,
    handleShutterTapLive,
    handleShutterTapAngle,
    handleShutterTapCaptured: planActions.handleShutterTapCaptured,
    enterAngleCaptureMode,
    handleShutterHold,
    handleSelectStop,
    handleDeleteStop,
    handleSelectTool,
    ...photoActions,
    handleReviewBack,
    planPinFlow,
    sourcePicker,
    sessionExit,
    torch,
    loop,
    session,
    lifecycleRunCount: streamLifecycle.lifecycleRunCount,
  };
}
