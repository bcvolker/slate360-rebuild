"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { useCaptureContext } from "@/components/site-walk/capture/CaptureContext";
import type { CameraRequestSource } from "@/components/site-walk/capture/capture-camera-events";
import { useCaptureFileHandler, type CaptureIntent } from "@/components/site-walk/capture/useCaptureFileHandler";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
import { readQuickCaptureLaunch, removeQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import {
  deriveCaptureV2MachineState,
  type CaptureV2MachineState,
} from "./capture-v2-state-machine";

type Args = {
  sessionId: string;
  projectId: string | null;
  initialItemId?: string | null;
  launchId?: string | null;
};

export function useCaptureV2Loop({ sessionId, projectId, initialItemId, launchId }: Args) {
  const captureCtx = useCaptureContext();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const intentRef = useRef<CaptureIntent>({ source: "quick_capture", input: "camera" });
  const consumedLaunchRef = useRef<string | null>(null);

  const [openingPicker, setOpeningPicker] = useState(false);
  const [advancingStop, setAdvancingStop] = useState(false);
  const [openingNextPicker, setOpeningNextPicker] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const captureItems = useCaptureItems({ sessionId, projectId });
  const fileHandler = useCaptureFileHandler({
    sessionId,
    planTarget: captureCtx.planTarget,
    clearTarget: captureCtx.clearPlanTarget,
    activeItem: captureItems.activeItem,
    onAngleCaptureFile: captureItems.savePhotoAngle,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const cleanup = fileHandler.cleanupPendingUpload;
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!initialItemId || captureItems.activeItem?.id === initialItemId) return;
    const target = captureItems.items.find(
      (item) => item.id === initialItemId || item.client_item_id === initialItemId,
    );
    if (target) captureItems.selectItem(target);
  }, [captureItems, initialItemId]);

  useEffect(() => {
    if (!launchId || consumedLaunchRef.current === launchId) return;
    consumedLaunchRef.current = launchId;
    void readQuickCaptureLaunch(launchId).then((launch) => {
      if (launch?.file) {
        intentRef.current = { source: "quick_capture", input: "camera" };
        fileHandler.setIntent(intentRef.current);
        fileHandler.handleFile(launch.file);
      }
      return removeQuickCaptureLaunch(launchId);
    });
  }, [fileHandler, launchId]);

  const openPickerDirect = useCallback(
    (input: "camera" | "upload", source: CameraRequestSource) => {
      setExternalError(null);
      setOpeningPicker(true);
      intentRef.current = { source, input };
      fileHandler.setIntent({ source, input });
      const ref = input === "camera" ? cameraInputRef : uploadInputRef;
      if (ref.current) {
        ref.current.value = "";
        ref.current.click();
      }
      setOpeningPicker(false);
    },
    [fileHandler],
  );

  useEffect(() => {
    captureCtx.openPickerRef.current = openPickerDirect;
    return () => {
      captureCtx.openPickerRef.current = null;
    };
  }, [captureCtx, openPickerDirect]);

  const machineState = useMemo<CaptureV2MachineState>(
    () =>
      deriveCaptureV2MachineState({
        openingPicker,
        advancingStop,
        openingNextPicker,
        pendingUpload: fileHandler.pendingUpload,
        confirmingUpload: fileHandler.confirmingUpload,
        uploadStatusKind: fileHandler.status.kind,
        saveState: captureItems.saveState,
        pendingUploadError: fileHandler.pendingUploadError,
        activePreview: fileHandler.activePreview,
        activeItem: captureItems.activeItem,
        externalError,
      }),
    [
      advancingStop,
      captureItems.activeItem,
      captureItems.saveState,
      externalError,
      fileHandler.activePreview,
      fileHandler.confirmingUpload,
      fileHandler.pendingUpload,
      fileHandler.pendingUploadError,
      fileHandler.status.kind,
      openingNextPicker,
      openingPicker,
    ],
  );

  useEffect(() => {
    const mapped =
      machineState === "uploading" || machineState === "upload_confirming"
        ? "uploading"
        : machineState === "active_item_ready" ||
            machineState === "draft_dirty" ||
            machineState === "saving_details"
          ? "active_item"
          : machineState === "advancing_stop" || machineState === "opening_next_picker"
            ? "advancing"
            : machineState === "opening_picker"
              ? "opening_picker"
              : machineState === "error"
                ? "error"
                : "idle";
    captureCtx.setFlowState(mapped);
  }, [captureCtx, machineState]);

  function resetFileInputClick(event: MouseEvent<HTMLInputElement>) {
    event.stopPropagation();
    event.currentTarget.value = "";
  }

  function handleDirectFileChange(event: ChangeEvent<HTMLInputElement>, confirmBeforeAttach: boolean) {
    event.stopPropagation();
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setExternalError(null);
    triggerHapticSuccess();
    fileHandler.setIntent(intentRef.current);
    fileHandler.handleFile(file, confirmBeforeAttach);
  }

  function saveAndNextStop() {
    setAdvancingStop(true);
    captureItems.flushCurrentDraft().catch((error) => {
      console.error("[capture-v2] Save & Next draft flush failed", error);
    });
    fileHandler.setActivePreview(null);
    captureItems.deselectItem();
    setAdvancingStop(false);
    setOpeningNextPicker(true);
    openPickerDirect(isDesktop ? "upload" : "camera", "next_item");
    setOpeningNextPicker(false);
  }

  const saveAndNextStopRef = useRef(saveAndNextStop);
  saveAndNextStopRef.current = saveAndNextStop;

  const handlePrimaryAction = useCallback(() => {
    switch (machineState) {
      case "empty":
        openPickerDirect(isDesktop ? "upload" : "camera", "quick_capture");
        return;
      case "active_item_ready":
        saveAndNextStopRef.current();
        return;
      case "draft_dirty":
        void captureItems.flushCurrentDraft();
        return;
      case "error":
        fileHandler.resetStatus();
        fileHandler.cancelPendingUpload();
        setExternalError(null);
        openPickerDirect(isDesktop ? "upload" : "camera", "quick_capture");
        return;
      default:
        return;
    }
  }, [captureItems, fileHandler, isDesktop, machineState, openPickerDirect]);

  function handleDrop(file: File | undefined) {
    if (!file || fileHandler.busy) return;
    intentRef.current = { source: "quick_capture", input: "upload" };
    fileHandler.setIntent(intentRef.current);
    fileHandler.handleFile(file, true);
  }

  return {
    ...captureItems,
    ...fileHandler,
    isDesktop,
    machineState,
    cameraInputRef,
    uploadInputRef,
    openPickerDirect,
    handlePrimaryAction,
    handleDirectFileChange,
    resetFileInputClick,
    handleDrop,
    externalError,
    setExternalError,
  };
}

export type CaptureV2Loop = ReturnType<typeof useCaptureV2Loop>;
