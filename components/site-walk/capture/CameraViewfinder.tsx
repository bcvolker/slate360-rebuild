"use client";

import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Camera, FileImage, Loader2, RotateCcw } from "lucide-react";
import { useCaptureUpload } from "@/lib/hooks/useCaptureUpload";
import { isMarkupData, type MarkupData } from "@/lib/site-walk/markup-types";
import { getItemPhotoAttachmentPins, type PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { createOfflineId } from "@/lib/site-walk/offline-db";
import { compressCaptureFile } from "@/lib/site-walk/image-compression";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { formatCaptureError } from "@/lib/site-walk/capture-error-format";
import { readQuickCaptureLaunch, removeQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";
import type { PhotoAngleCaptureMode, PhotoAngleRecord } from "@/lib/site-walk/photo-angles";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture, type CameraRequestDetail } from "./capture-camera-events";
import { CaptureQuickNotePanel } from "./CaptureQuickNotePanel";
import { CaptureUploadBadge } from "./CaptureUploadBadge";
import { publishCaptureItemFocus } from "./capture-item-events";
import { buildLocalPhotoItem, readLastTitle, statusClasses } from "./cameraViewfinderHelpers";
import { useOptionalCaptureContext } from "./CaptureContext";
import { PendingUploadPreviewModal } from "./PendingUploadPreviewModal";
import { PhotoMarkupCanvas } from "./PhotoMarkupCanvas";
import { usePlanCaptureTarget } from "./plan-capture-events";
import { VECTOR_TOOL_EVENT } from "./UnifiedVectorToolbar";

type Props = {
  sessionId: string;
  autoOpenCamera?: boolean;
  launchId?: string | null;
  layout?: "full" | "visual";
  activeItem?: CaptureItemRecord | null;
  activeImageUrl?: string | null;
  activeImageTitle?: string | null;
  activeImageKey?: string | null;
  markupEnabled?: boolean;
  onPlanCaptureSaved?: () => void;
  onAngleCaptureFile?: (itemId: string, file: File, previewUrl: string, captureMode: PhotoAngleCaptureMode) => Promise<PhotoAngleRecord | null>;
  onPreviewStateChange?: (active: boolean) => void;
  onMarkupChange?: (itemId: string, markup: MarkupData) => void;
  onAttachmentPinsChange?: (itemId: string, pins: PhotoAttachmentPin[]) => void;
};

type PendingUpload = { file: File; url: string };
type CaptureIntent = Pick<CameraRequestDetail, "source" | "input">;

export function CameraViewfinder({ sessionId, autoOpenCamera = false, launchId = null, layout = "full", activeItem = null, activeImageUrl = null, activeImageTitle = null, activeImageKey = null, markupEnabled = true, onPlanCaptureSaved, onAngleCaptureFile, onPreviewStateChange, onMarkupChange, onAttachmentPinsChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const consumedLaunchRef = useRef<string | null>(null);
  const pendingUploadRef = useRef<PendingUpload | null>(null);
  const captureIntentRef = useRef<CaptureIntent>({ source: "quick_capture", input: "camera" });
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activePreview, setActivePreview] = useState<{ url: string; title: string; itemId: string } | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [pendingUploadError, setPendingUploadError] = useState<string | null>(null);
  const [confirmingUpload, setConfirmingUpload] = useState(false);
  const captureCtx = useOptionalCaptureContext();
  const { target: legacyTarget, clearTarget: clearLegacyTarget } = usePlanCaptureTarget();
  const target = captureCtx?.planTarget ?? legacyTarget;
  console.log("[capture]#3 render target", target);
  const clearTarget = captureCtx ? captureCtx.clearPlanTarget : clearLegacyTarget;
  const { status, savePhoto, saveTextNote, resetStatus } = useCaptureUpload({ sessionId, planTarget: target, onPlanTargetSaved: clearTarget, onSaved: (item, context) => { publishCaptureItemFocus({ item, reason: "captured", focus: false }); if (context.planTarget) onPlanCaptureSaved?.(); } });
  const busy = status.kind === "uploading" || status.kind === "saving" || confirmingUpload;
  const visualOnly = layout === "visual";

  useEffect(() => setMounted(true), []);

  useEffect(() => onPreviewStateChange?.(Boolean(activePreview)), [activePreview, onPreviewStateChange]);

  useEffect(() => () => {
    if (pendingUploadRef.current) URL.revokeObjectURL(pendingUploadRef.current.url);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const pending = captureCtx?.pendingCapture;
    if (!pending) return;
    captureIntentRef.current = { source: pending.source, input: pending.input };
    const ref = pending.input === "camera" ? cameraInputRef : uploadInputRef;
    const handle = window.setTimeout(() => ref.current?.click(), 60);
    captureCtx?.consumePendingCapture();
    return () => window.clearTimeout(handle);
  }, [captureCtx, captureCtx?.pendingCapture, mounted]);

  useEffect(() => {
    if (!mounted || !autoOpenCamera || captureCtx) return;
    // Legacy path only: contexts handle this via requestCapture.
    const timeout = window.setTimeout(() => cameraInputRef.current?.click(), 350);
    return () => window.clearTimeout(timeout);
  }, [autoOpenCamera, captureCtx, mounted]);

  useEffect(() => {
    if (!mounted || !launchId || consumedLaunchRef.current === launchId) return;
    consumedLaunchRef.current = launchId;
    void readQuickCaptureLaunch(launchId).then((launch) => {
      if (launch?.file) handleFile(launch.file);
      return removeQuickCaptureLaunch(launchId);
    });
  }, [launchId, mounted]);

  useEffect(() => {
    if (!activeItem) return;
    const url = activeImageUrl ?? getCaptureImageUrl(activeItem);
    if (!url) return;
    setActivePreview((current) => {
      const title = activeImageTitle ?? activeItem.title ?? "Captured photo";
      if (current?.url === url && current.itemId === activeItem.id) return { ...current, title, itemId: activeItem.id };
      return { url, title, itemId: activeItem.id };
    });
  }, [activeImageKey, activeImageTitle, activeImageUrl, activeItem]);

  function resetFileInputClick(event: MouseEvent<HTMLInputElement>) {
    event.stopPropagation();
    event.currentTarget.value = "";
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>, confirmBeforeAttach: boolean) {
    event.stopPropagation();
    handleFile(event.currentTarget.files?.[0], confirmBeforeAttach);
    event.currentTarget.value = "";
  }

  function handleFile(file: File | undefined, confirmBeforeAttach = false) {
    if (!file) return;
    if (confirmBeforeAttach) {
      previewUploadFile(file);
      return;
    }
    void prepareCaptureFile(file).catch(() => undefined);
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
    console.log("[capture]#4 confirmPendingUpload", { upload, target });
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
          await onAngleCaptureFile(activeItem.id, captureFile, previewUrl, intent.input);
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

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy) return;
    captureIntentRef.current = { source: "quick_capture", input: "upload" };
    handleFile(event.dataTransfer.files[0], true);
  }

  function openCaptureInput(intent: CaptureIntent) {
    captureIntentRef.current = intent;
    if (intent.input === "camera") cameraInputRef.current?.click();
    else uploadInputRef.current?.click();
  }

  function triggerCapture(input: "camera" | "upload", source: CameraRequestDetail["source"]) {
    if (captureCtx) {
      captureCtx.requestCapture(input, source);
      return;
    }
    requestCameraCapture(input, source);
  }

  return (
    <section className={visualOnly ? "flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950" : "rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-slate-50 shadow-lg shadow-black/30"}>
      {target && (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Next capture attaches to the selected plan pin.</span>
          <button type="button" onClick={clearTarget} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-amber-400">Clear plan target</button>
        </div>
      )}

      <div className={visualOnly ? "min-h-0 flex-1 bg-zinc-950" : "rounded-3xl bg-slate-950/55 p-4 ring-1 ring-white/10"}>
        <div className={visualOnly ? "flex h-full min-h-0 flex-col items-center justify-center text-center" : "flex min-h-[280px] flex-col items-center justify-center text-center"}>
          {activePreview ? (
            <div className={visualOnly ? "relative h-full w-full" : "w-full space-y-3"}>
              <PhotoMarkupCanvas
                imageUrl={activePreview.url}
                title={activePreview.title}
                sessionId={sessionId}
                markupEnabled={markupEnabled}
                initialMarkup={isMarkupData(activeItem?.markup_data) ? activeItem.markup_data : undefined}
                attachmentPins={getItemPhotoAttachmentPins(activeItem)}
                onAttachmentPinsChange={(pins) => onAttachmentPinsChange?.(activePreview.itemId, pins)}
                onMarkupChange={(markup) => onMarkupChange?.(activePreview.itemId, markup)}
              />
              {visualOnly && <CaptureUploadBadge kind={status.kind} />}
              {!visualOnly && <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => triggerCapture("camera", "next_item")} disabled={busy || !mounted} className="min-h-12 rounded-2xl bg-amber-500 px-4 py-3 text-base font-black text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-60">
                  <span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Capture next item</span>
                </button>
                <button type="button" onClick={() => triggerCapture("upload", "next_item")} disabled={busy || !mounted} className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-black text-slate-200 transition hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-60">
                  <span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Upload next image</span>
                </button>
              </div>}
            </div>
          ) : (
            <>
          <Camera className="h-12 w-12 text-amber-400 md:hidden" />
          <FileImage className="hidden h-12 w-12 text-amber-400 md:block" />
          <h2 className="mt-4 text-2xl font-black text-white">Capture field proof</h2>
          <p className={`mt-2 max-w-lg text-sm leading-6 ${visualOnly ? "px-5 text-slate-300" : "text-slate-400"}`}>
            One tap opens the camera. The image appears immediately, the drawer opens for notes/classification, and upload/offline sync continues in the background.
          </p>

          <div className="mt-6 grid w-full max-w-xl gap-3 md:hidden">
            <button type="button" onClick={() => openCaptureInput({ source: "quick_capture", input: "camera" })} disabled={busy || !mounted} className="min-h-16 rounded-3xl bg-amber-500 px-5 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><Camera className="h-5 w-5" /> Take Photo</span>
            </button>
            <button type="button" onClick={() => openCaptureInput({ source: "quick_capture", input: "upload" })} disabled={busy || !mounted} className="min-h-16 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-lg font-black text-white transition hover:border-amber-400 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Camera Roll</span>
            </button>
          </div>

          <div
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-6 hidden w-full max-w-2xl rounded-3xl border-2 border-dashed p-10 transition md:flex md:min-h-64 md:flex-col md:items-center md:justify-center ${dragActive ? "border-amber-500 bg-amber-500/10" : "border-white/15 bg-white/[0.04]"}`}
          >
            <p className="text-2xl font-black text-white">Drag &amp; Drop Photos Here</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Desktop mode is upload-first for job trailer workflows.</p>
            <button type="button" onClick={() => openCaptureInput({ source: "quick_capture", input: "upload" })} disabled={busy || !mounted} className="mt-6 min-h-12 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><FileImage className="h-5 w-5" /> Select Photos from Computer</span>
            </button>
          </div>
            </>
          )}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onClick={resetFileInputClick} onChange={(event) => handleFileInputChange(event, false)} />
        <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onClick={resetFileInputClick} onChange={(event) => handleFileInputChange(event, true)} />
      </div>

      {pendingUpload && <PendingUploadPreviewModal fileName={pendingUpload.file.name} imageUrl={pendingUpload.url} busy={busy} errorMessage={pendingUploadError} onCancel={cancelPendingUpload} onConfirmAttach={confirmPendingUpload} />}

      {!visualOnly && <CaptureQuickNotePanel busy={busy} onSaveTextNote={saveTextNote} />}

      {!visualOnly && <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-black ${statusClasses(status.kind)}`}>
        <span className="inline-flex items-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{status.message}</span>
        {status.kind !== "idle" && <button type="button" onClick={resetStatus} className="rounded-lg p-1 hover:bg-white/10" aria-label="Reset status"><RotateCcw className="h-4 w-4" /></button>}
      </div>}
    </section>
  );
}
