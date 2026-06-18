"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/lib/hooks/useCamera";
import { buildCaptureV2SummaryUrl } from "@/lib/site-walk/capture-v2-config";
import { compressCaptureFile } from "@/lib/site-walk/image-compression";
import { getItemPhotoAngles, getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
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

  // When entering angle mode from a captured photo we snapshot the photo URL so we can
  // render it (dimmed) as a stable visual reference behind the live camera while it primes.
  // This removes the jarring "photo disappears, pure live video jumps in" on "Add Angle".
  const [angleContextUrl, setAngleContextUrl] = useState<string | null>(null);

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
    if (showPreview) {
      // Do not auto-hide the angle strip after landing in a captured photo.
      // If the item already has angles (or we just added one), force the filmstrip slot
      // visible so the user immediately sees the result of "Add Angle" without an extra tap.
      const angleCount = activeItem ? getItemPhotoAngles(activeItem).length : 0;
      setFilmstripExpanded(angleCount > 0);
    }
  }, [showPreview, activeItem]);

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

    if (angleCaptureMode) {
      // Special behavior while shooting an angle: the big live area is primarily
      // for framing. If we are still blocked (common right after "Add Angle"
      // because camera start is async), a tap here means "prime / resume camera"
      // instead of just toggling chrome. This makes the capture button path
      // (and the view itself) much more forgiving.
      if (captureBlocked || !camera.hasLiveFrames) {
        setCaptureBlocked(false);
        if (camera.needsUserResume || !camera.streamAlive) {
          void (camera.needsUserResume ? camera.reattachVideo() : camera.startCamera(facingMode));
        }
        return;
      }
      // Once live, allow chrome toggle on the live view if desired.
      setChromeVisible((value) => !value);
      return;
    }

    setChromeVisible((value) => !value);
  }, [angleCaptureMode, camera, captureBlocked, facingMode, markupEnabled, showPreview]);

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

    // Snapshot whatever the user is currently looking at (main or previous angle).
    // We will use this as a dimmed background layer during the live angle shot so the
    // screen does not jump from "my photo" to a full live camera with nothing underneath.
    const currentDisplay =
      displayUrl || previewUrl || loop.activePreview?.url || getPhotoAngleImageUrl(activeItem, activeAngleId) || null;
    if (currentDisplay) {
      setAngleContextUrl(currentDisplay);
    }

    setActiveTool("angle");
    setActiveAngleId(null);
    setCaptureBlocked(false);
    loop.setActivePreview(null);
    loop.setIntent({ source: "angle", input: "camera" });

    // Fire the camera start but do not assume it is instantly ready. The shutter guards
    // + canvas tap handler + LiveCamera warming states will handle the transient.
    if (camera.needsUserResume) return;
    if (camera.streamAlive) {
      void camera.reattachVideo();
      return;
    }
    void camera.startCamera(facingMode);
  }, [activeAngleId, activeItem, camera, displayUrl, facingMode, loop, previewUrl]);

  const exitAngleCaptureMode = useCallback(() => {
    setActiveTool(null);
    setActiveAngleId(null);
    setCaptureBlocked(false);
    if (angleContextUrl) {
      // Restore the exact photo the user was viewing before they tapped "Add Angle".
      // This gives a clean, instant "never left the stop" feeling instead of forcing
      // another full navigation or re-capture.
      loop.setActivePreview({
        url: angleContextUrl,
        title: activeItem?.title?.trim() || "Captured photo",
        itemId: activeItem?.id ?? "",
      });
    }
    setAngleContextUrl(null);
  }, [activeItem, angleContextUrl, loop]);

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
      // Aggressively try to get the camera live on the next frame / next tap.
      // This is the main reason "pushing the capture button doesn't always work"
      // right after tapping Add Angle — we were previously racing the async start.
      if (camera.needsUserResume) {
        void camera.reattachVideo();
      } else {
        void camera.startCamera(facingMode);
      }
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
      setAngleContextUrl(null); // background reference no longer needed
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
      // Force the angle strip visible immediately so the user sees the newly captured angle
      // without having to tap the filmstrip chevron. This was a major source of "where did it go?".
      setFilmstripExpanded(true);
      triggerHapticSuccess();
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      loop.setExternalError(error instanceof Error ? error.message : "Angle capture failed.");
    }
  }, [activeItem, camera, facingMode, loop]);

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

  // Used by the top bar chevron. In angle mode this becomes "cancel angle capture and
  // go back to the photo you were adding the angle to" instead of the plan return.
  // Gives users an obvious escape hatch when the camera is slow to warm.
  const handleTopBarBack = useCallback(() => {
    if (angleCaptureMode) {
      exitAngleCaptureMode();
      return;
    }
    if (planPinFlow?.onReturnToPlan) {
      planPinFlow.onReturnToPlan();
    } else if (returnFromSummary) {
      router.push(buildCaptureV2SummaryUrl(session.id));
    }
  }, [angleCaptureMode, exitAngleCaptureMode, planPinFlow, returnFromSummary, router, session.id]);

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
    angleContextUrl,
    handleCanvasTap,
    handleShutterTapLive,
    handleShutterTapAngle,
    handleShutterTapCaptured: planActions.handleShutterTapCaptured,
    enterAngleCaptureMode,
    exitAngleCaptureMode,
    handleTopBarBack,
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
