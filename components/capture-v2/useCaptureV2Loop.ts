"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { useCaptureContext } from "@/components/site-walk/capture/CaptureContext";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import type { CameraRequestSource } from "@/components/site-walk/capture/capture-camera-events";
import { useCaptureFileHandler, type CaptureIntent } from "@/components/site-walk/capture/useCaptureFileHandler";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
import { readQuickCaptureLaunch, removeQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import { SITE_WALK_OFFLINE_EVENT } from "@/lib/site-walk/offline-db";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { deleteCaptureV2Stop } from "./capture-v2-delete-stop";
import { resolveCaptureV2PreviewUrl } from "./capture-v2-preview-url";
import { flushCaptureV2Details } from "./capture-v2-save-details";
import {
  deriveCaptureV2MachineState,
  type CaptureV2MachineState,
} from "./capture-v2-state-machine";

type Args = {
  sessionId: string;
  projectId: string | null;
  initialItemId?: string | null;
  launchId?: string | null;
  onPlanCaptureSaved?: (pin: import("@/lib/types/site-walk").SiteWalkPin | null) => void;
};

export function useCaptureV2Loop({ sessionId, projectId, initialItemId, launchId, onPlanCaptureSaved }: Args) {
  const captureCtx = useCaptureContext();
  const { syncOfflineItems } = useSiteWalkSession();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const desktopMultiInputRef = useRef<HTMLInputElement>(null);
  const intentRef = useRef<CaptureIntent>({ source: "quick_capture", input: "camera" });
  const consumedLaunchRef = useRef<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);
  const pendingFollowUpParentRef = useRef<string | null>(null);

  const [openingPicker, setOpeningPicker] = useState(false);
  const [advancingStop, setAdvancingStop] = useState(false);
  const [openingNextPicker, setOpeningNextPicker] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailSaveError, setDetailSaveError] = useState<string | null>(null);
  const [deletedStopKeys, setDeletedStopKeys] = useState<Set<string>>(() => new Set());
  const [deletingStopId, setDeletingStopId] = useState<string | null>(null);

  const captureItems = useCaptureItems({ sessionId, projectId });
  const fileHandler = useCaptureFileHandler({
    sessionId,
    planTarget: captureCtx.planTarget,
    clearTarget: captureCtx.clearPlanTarget,
    activeItem: captureItems.activeItem,
    onAngleCaptureFile: captureItems.savePhotoAngle,
    onPlanCaptureSaved,
  });

  useEffect(() => {
    setLocationLabel(captureItems.activeItem?.location_label ?? "");
    setDetailSaveError(null);
  }, [captureItems.activeItem?.id, captureItems.activeItem?.location_label]);

  useEffect(() => {
    const parentId = pendingFollowUpParentRef.current;
    const item = captureItems.activeItem;
    const draft = captureItems.draft;
    if (!parentId || !item || !draft) return;
    if (draft.beforeItemId === parentId) {
      pendingFollowUpParentRef.current = null;
      return;
    }
    captureItems.patchDraft({
      beforeItemId: parentId,
      itemRelationship: "after",
    });
    pendingFollowUpParentRef.current = null;
  }, [captureItems.activeItem?.id, captureItems.draft, captureItems.patchDraft]);

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
    const url = fileHandler.activePreview?.url;
    if (url?.startsWith("blob:")) previewBlobRef.current = url;
  }, [fileHandler.activePreview?.url]);

  useEffect(() => {
    if (fileHandler.status.kind !== "complete" && fileHandler.status.kind !== "idle") return;
    const preview = fileHandler.activePreview;
    if (!preview) return;
    if (preview.url.startsWith("blob:")) return;
    const item = captureItems.activeItem;
    const nextUrl = resolveCaptureV2PreviewUrl(item, preview.url);
    if (!nextUrl || preview.url === nextUrl) return;
    fileHandler.setActivePreview({
      url: nextUrl,
      title: preview.title,
      itemId: preview.itemId,
    });
  }, [captureItems.activeItem, fileHandler, fileHandler.activePreview, fileHandler.status.kind]);

  const visibleItems = useMemo(
    () =>
      captureItems.items.filter((item) => {
        if (deletedStopKeys.has(item.id)) return false;
        if (item.client_item_id && deletedStopKeys.has(item.client_item_id)) return false;
        return true;
      }),
    [captureItems.items, deletedStopKeys],
  );

  const setIntent = useCallback(
    (intent: CaptureIntent) => {
      intentRef.current = intent;
      fileHandler.setIntent(intent);
    },
    [fileHandler],
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flushWhenOnline = () => {
      if (navigator.onLine) void syncOfflineItems();
    };
    window.addEventListener(SITE_WALK_OFFLINE_EVENT, flushWhenOnline);
    return () => window.removeEventListener(SITE_WALK_OFFLINE_EVENT, flushWhenOnline);
  }, [syncOfflineItems]);

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
        externalError: detailSaveError ?? externalError,
        detailsSaving,
      }),
    [
      advancingStop,
      captureItems.activeItem,
      captureItems.saveState,
      detailSaveError,
      detailsSaving,
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

  const flushDetails = useCallback(async () => {
    const { activeItem, draft } = captureItems;
    if (!activeItem || !draft) return;
    setDetailsSaving(true);
    setDetailSaveError(null);
    const result = await flushCaptureV2Details({
      sessionId,
      activeItem,
      draft,
      locationLabel,
    });
    setDetailsSaving(false);
    if (!result.ok) {
      setDetailSaveError(result.error);
      setExternalError(result.error);
      return;
    }
    if (result.item) captureItems.selectItem(result.item);
  }, [captureItems, locationLabel, sessionId]);

  const flushDetailsRef = useRef(flushDetails);
  flushDetailsRef.current = flushDetails;

  function revokePreviewBlob() {
    const blobUrl = previewBlobRef.current ?? fileHandler.activePreview?.url;
    if (!blobUrl?.startsWith("blob:")) return;
    const stillUsed = visibleItems.some((item) => item.local_preview_url === blobUrl);
    if (stillUsed) {
      previewBlobRef.current = null;
      return;
    }
    URL.revokeObjectURL(blobUrl);
    previewBlobRef.current = null;
  }

  async function startVoiceNoteOnly() {
    setExternalError(null);
    await fileHandler.saveTextNote("Voice note", "voice");
    triggerHapticSuccess();
  }

  function handleMultiFileDrop(files: File[]) {
    if (files.length === 0 || fileHandler.busy) return;
    for (const file of files) {
      intentRef.current = { source: "quick_capture", input: "upload" };
      fileHandler.setIntent(intentRef.current);
      triggerHapticSuccess();
      fileHandler.handleFile(file, false);
    }
  }

  async function saveAndNextStop(): Promise<boolean> {
    setAdvancingStop(true);
    try {
      await flushDetailsRef.current();
      await captureItems.flushCurrentDraft();
      triggerHapticSuccess();
      revokePreviewBlob();
      fileHandler.setActivePreview(null);
      captureItems.deselectItem();
      return true;
    } catch (error) {
      console.error("[capture-v2] Save & Next failed", error);
      setExternalError("Could not save this stop — check your connection and try again.");
      return false;
    } finally {
      setAdvancingStop(false);
    }
  }

  async function createFollowUpStop() {
    const parentItem = captureItems.activeItem;
    if (!parentItem) return;
    setAdvancingStop(true);
    try {
      await flushDetailsRef.current();
      await captureItems.flushCurrentDraft();
      pendingFollowUpParentRef.current = parentItem.id;
      triggerHapticSuccess();
      revokePreviewBlob();
      fileHandler.setActivePreview(null);
      captureItems.deselectItem();
    } catch (error) {
      console.error("[capture-v2] Create follow-up failed", error);
    } finally {
      setAdvancingStop(false);
    }
  }

  const saveAndNextStopRef = useRef(saveAndNextStop);
  saveAndNextStopRef.current = saveAndNextStop;

  const addAnotherAngle = useCallback(() => {
    if (!captureItems.activeItem) return;
    setExternalError(null);
    const input = isDesktop ? "upload" : "camera";
    intentRef.current = { source: "angle", input };
    fileHandler.setIntent({ source: "angle", input });
    openPickerDirect(input, "angle");
  }, [captureItems.activeItem, fileHandler, isDesktop, openPickerDirect]);

  const handlePrimaryAction = useCallback(() => {
    switch (machineState) {
      case "empty":
        openPickerDirect(isDesktop ? "upload" : "camera", "quick_capture");
        return;
      case "active_item_ready":
        saveAndNextStopRef.current();
        return;
      case "draft_dirty":
        void flushDetails();
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
  }, [captureItems, fileHandler, flushDetails, isDesktop, machineState, openPickerDirect]);

  function handleDrop(file: File | undefined) {
    if (!file || fileHandler.busy) return;
    intentRef.current = { source: "quick_capture", input: "upload" };
    fileHandler.setIntent(intentRef.current);
    fileHandler.handleFile(file, true);
  }

  const focusFilmstripItem = useCallback(
    (item: CaptureItemRecord) => {
      captureItems.selectItem(item);
      setExternalError(null);
      setDetailSaveError(null);
      const imageUrl = resolveCaptureV2PreviewUrl(item, null);
      if (imageUrl) {
        fileHandler.setActivePreview({
          url: imageUrl,
          title: item.title?.trim() || "Captured photo",
          itemId: item.id,
        });
      } else {
        fileHandler.setActivePreview(null);
      }
    },
    [captureItems, fileHandler],
  );

  const deleteStop = useCallback(
    async (item: CaptureItemRecord) => {
      setDeletingStopId(item.id);
      setExternalError(null);
      try {
        const result = await deleteCaptureV2Stop(item);
        if (!result.ok) {
          setExternalError(result.error);
          return result;
        }
        const keys = [item.id, item.client_item_id].filter(Boolean) as string[];
        setDeletedStopKeys((current) => {
          const next = new Set(current);
          keys.forEach((key) => next.add(key));
          return next;
        });
        if (
          captureItems.activeItem &&
          (captureItems.activeItem.id === item.id ||
            (!!captureItems.activeItem.client_item_id &&
              captureItems.activeItem.client_item_id === item.client_item_id))
        ) {
          fileHandler.setActivePreview(null);
          captureItems.deselectItem();
        }
        triggerHapticSuccess();
        return result;
      } finally {
        setDeletingStopId(null);
      }
    },
    [captureItems, fileHandler],
  );

  return {
    ...captureItems,
    items: visibleItems,
    ...fileHandler,
    isDesktop,
    machineState,
    cameraInputRef,
    uploadInputRef,
    desktopMultiInputRef,
    openPickerDirect,
    setIntent,
    handlePrimaryAction,
    handleDirectFileChange,
    resetFileInputClick,
    handleDrop,
    handleMultiFileDrop,
    externalError,
    setExternalError,
    locationLabel,
    setLocationLabel,
    detailsSaving,
    detailSaveError,
    flushDetails,
    focusFilmstripItem,
    deleteStop,
    deletingStopId,
    startVoiceNoteOnly,
    saveAndNextStop,
    createFollowUpStop,
    addAnotherAngle,
  };
}

export type CaptureV2Loop = ReturnType<typeof useCaptureV2Loop>;
