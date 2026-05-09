/**
 * Extracted from CameraViewfinder — manages file selection, preview confirmation,
 * compression, and upload for captured/uploaded images.
 */
import { useRef, useState } from "react";
import { useCaptureUpload, type PlanCaptureTarget } from "@/lib/hooks/useCaptureUpload";
import { isMarkupData } from "@/lib/site-walk/markup-types";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import { compressCaptureFile } from "@/lib/site-walk/image-compression";
import { formatCaptureError } from "@/lib/site-walk/capture-error-format";
import type { PhotoAngleCaptureMode, PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { publishCaptureItemFocus } from "./capture-item-events";
import { buildLocalPhotoItem, readLastTitle } from "./cameraViewfinderHelpers";
import { VECTOR_TOOL_EVENT } from "./UnifiedVectorToolbar";

export type PendingUpload = { file: File; url: string };
export type CaptureIntent = { source: string; input: "camera" | "upload" };

type Args = {
  sessionId: string;
  planTarget: PlanCaptureTarget | null;
  clearTarget: () => void;
  activeItem: CaptureItemRecord | null;
  onPlanCaptureSaved?: () => void;
  onAngleCaptureFile?: (itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) => Promise<PhotoAngleRecord | null>;
};

export function useCaptureFileHandler({ sessionId, planTarget, clearTarget, activeItem, onPlanCaptureSaved, onAngleCaptureFile }: Args) {
  const pendingUploadRef = useRef<PendingUpload | null>(null);
  const captureIntentRef = useRef<CaptureIntent>({ source: "quick_capture", input: "camera" });
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [pendingUploadError, setPendingUploadError] = useState<string | null>(null);
  const [confirmingUpload, setConfirmingUpload] = useState(false);
  const [activePreview, setActivePreview] = useState<{ url: string; title: string; itemId: string } | null>(null);

  const { status, savePhoto, saveTextNote, resetStatus } = useCaptureUpload({
    sessionId,
    planTarget,
    onPlanTargetSaved: clearTarget,
    onSaved: (item, context) => {
      publishCaptureItemFocus({ item, reason: "captured", focus: false });
      if (context.planTarget) onPlanCaptureSaved?.();
    },
  });

  const busy = status.kind === "uploading" || status.kind === "saving" || confirmingUpload;

  function setIntent(intent: CaptureIntent) {
    captureIntentRef.current = intent;
  }

  function previewUploadFile(file: File) {
    if (pendingUploadRef.current) URL.revokeObjectURL(pendingUploadRef.current.url);
    const next = { file, url: URL.createObjectURL(file) };
    pendingUploadRef.current = next;
    setPendingUploadError(null);
    setPendingUpload(next);
  }

  function cancelPendingUpload() {
    if (confirmingUpload) return;
    if (pendingUploadRef.current) URL.revokeObjectURL(pendingUploadRef.current.url);
    pendingUploadRef.current = null;
    setPendingUploadError(null);
    setPendingUpload(null);
  }

  async function confirmPendingUpload() {
    const upload = pendingUploadRef.current;
    console.log("[capture]#4 confirmPendingUpload", { upload, target: planTarget });
    if (!upload) return;
    setPendingUploadError(null);
    setConfirmingUpload(true);
    try {
      await prepareCaptureFile(upload.file, upload.url);
      pendingUploadRef.current = null;
      setPendingUpload(null);
    } catch (error) {
      setPendingUploadError(formatCaptureError(error));
    } finally {
      setConfirmingUpload(false);
    }
  }

  async function prepareCaptureFile(file: File, previewUrl = URL.createObjectURL(file)) {
    try {
      const intent = captureIntentRef.current;
      if (intent.source === "angle" && activeItem && onAngleCaptureFile) {
        setActivePreview({ url: previewUrl, title: `${activeItem.title || "Captured photo"} — angle`, itemId: activeItem.id });
        window.dispatchEvent(new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool: "select" } }));
        const captureFile = await compressCaptureFile(file);
        try {
          await onAngleCaptureFile(activeItem.id, captureFile, previewUrl, intent.input as PhotoAngleCaptureMode);
        } finally {
          captureIntentRef.current = { source: "quick_capture", input: "camera" };
        }
        return;
      }
      const clientItemId = createOfflineId("item");
      const clientMutationId = createOfflineId("mutation");
      const title = readLastTitle(sessionId);
      const localItem = buildLocalPhotoItem(sessionId, title, previewUrl, clientItemId, clientMutationId);
      setActivePreview({ url: previewUrl, title: title || "Captured photo", itemId: clientItemId });
      publishCaptureItemFocus({ item: localItem, reason: "captured", focus: true });
      window.dispatchEvent(new CustomEvent(VECTOR_TOOL_EVENT, { detail: { tool: "select" } }));
      const captureFile = await compressCaptureFile(file);
      await savePhoto(captureFile, { clientItemId, clientMutationId, previewUrl, title });
    } catch (error) {
      console.error("[capture]#5 prepare", error);
      throw error;
    }
  }

  function handleFile(file: File | undefined, confirmBeforeAttach = false) {
    if (!file) return;
    if (confirmBeforeAttach) {
      previewUploadFile(file);
      return;
    }
    void prepareCaptureFile(file).catch(() => undefined);
  }

  function cleanupPendingUpload() {
    if (pendingUploadRef.current) URL.revokeObjectURL(pendingUploadRef.current.url);
  }

  return {
    status, busy, saveTextNote, resetStatus,
    activePreview, setActivePreview,
    pendingUpload, pendingUploadError, confirmingUpload,
    captureIntentRef,
    setIntent, handleFile, previewUploadFile, cancelPendingUpload, confirmPendingUpload,
    cleanupPendingUpload,
  };
}
